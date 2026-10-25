"""Autonomous Outbound Talent Sourcing Module for RecruitAI Suite.

Performs:
1. AI JD Analysis & Boolean X-Ray Query Construction.
2. Free, safe talent profile discovery via DuckDuckGo Search (DDGS).
3. Candidate profile parsing & relevance scoring.
4. Multi-channel personalized outreach pitch generation (LinkedIn, Email, WhatsApp).
"""

import json
import logging
import re
import time
import urllib.parse
from typing import Dict, Any, List, Optional
from ddgs import DDGS
from extractor import _call_llm
from query_builder import generate_sourcing_queries, is_valid_candidate_url, get_title_synonyms

logger = logging.getLogger("talent_sourcer")

JD_SOURCING_PROMPT = """You are an elite Executive Tech Recruiter and Sourcing Specialist.
Analyze this Job Description (JD) and design a high-precision multi-platform talent sourcing strategy for active job seekers.

Job Title Hint: {role_hint}
Target Location: {location_hint}

Job Description:
{jd_text}

Task:
1. Extract the canonical role title, seniority level, and target location.
2. Identify 4-7 critical must-have technical skills/keywords.
3. Generate concise, high-yield search queries optimized for search engines (do NOT use nested parentheses with 3+ OR groups):
   - Query 1 (LinkedIn Active): site:linkedin.com/in/ "<canonical title>" "open to work" {location_term}
   - Query 2 (LinkedIn Immediate): site:linkedin.com/in/ "<canonical title>" "immediate joiner" {location_term}
   - Query 3 (LinkedIn Skills): site:linkedin.com/in/ "<canonical title>" "<top skill>" {location_term}
   - Query 4 (GitHub Developers): site:github.com "<canonical title>" {location_term}
   - Query 5 (Portfolios & Resumes): (site:naukri.com OR site:indeed.com) "<canonical title>" {location_term}

Return ONLY valid JSON with this exact structure:
{{
  "job_title": "e.g. AI Developer",
  "seniority": "e.g. 3-5 Years / Mid-Senior",
  "location": "e.g. India",
  "core_skills": ["Python", "Machine Learning", "NLP", "Deep Learning"],
  "nice_to_have_skills": ["Docker", "FastAPI", "PyTorch"],
  "brief_summary": "1-2 sentence summary of what this role requires.",
  "search_queries": [
    "site:linkedin.com/in/ \\"AI Developer\\" \\"open to work\\" {location_term}",
    "site:linkedin.com/in/ \\"AI Developer\\" \\"immediate joiner\\" {location_term}",
    "site:linkedin.com/in/ \\"AI Developer\\" \\"Python\\" {location_term}",
    "site:github.com \\"AI Developer\\" {location_term}",
    "(site:naukri.com OR site:indeed.com) \\"AI Developer\\" {location_term}"
  ]
}}
"""

OUTREACH_PROMPT = """You are a warm, highly professional Talent Acquisition Partner at {company_name}.
Write 3 personalized outreach messages to invite this candidate to explore an open role.

Target Role: {job_title}
Job Overview: {jd_summary}

Candidate Details:
Name: {candidate_name}
Headline/Role: {candidate_headline}
Profile Snippet: {candidate_snippet}
Detected Skills: {matched_skills}

Instructions:
1. linkedin_note: Connection request note, maximum 280 characters. Warm, mentions their specific technical background, invites them to connect.
2. email_pitch: A complete cold email with a catchy "subject" and structured "body". Mention why their specific background caught your eye, why this firmware/tech challenge is compelling, and ask if they are open to a brief chat or sharing their updated CV.
3. whatsapp_dm: A quick, polite, friendly direct message (suitable for WhatsApp or Telegram). Conversational and easy to reply with a resume PDF.

Return ONLY valid JSON:
{{
  "linkedin_note": "Hi [Name], came across your background in [Skill]...",
  "email_subject": "Exciting [Role] opportunity @ [Company] - [Candidate Name]",
  "email_body": "Hi [Name],\\n\\nI noticed your strong experience with...\\n\\nBest regards,\\n[Recruiter Name]",
  "whatsapp_dm": "Hi [Name]! Hope you're having a great week..."
}}
"""


def detect_platform(url: str) -> str:
    """Identifies the candidate profile platform from URL."""
    u = url.lower()
    if "linkedin.com" in u:
        return "LinkedIn"
    elif "github.com" in u:
        return "GitHub"
    elif "naukri.com" in u:
        return "Naukri"
    elif "indeed.com" in u:
        return "Indeed"
    elif u.endswith(".pdf") or u.endswith(".docx") or "resume" in u or "cv" in u:
        return "Public Resume"
    return "Web"


def clean_candidate_name(title: str, url: str) -> tuple[str, str, str]:
    """Parse candidate name, headline, and platform from search result title."""
    platform = detect_platform(url)
    cleaned = title
    for suffix in [
        "| LinkedIn India", "- LinkedIn India", "| LinkedIn", "- LinkedIn", "LinkedIn India", "LinkedIn",
        "| Naukri.com", "- Naukri.com", "Naukri.com", "Naukri",
        "| Indeed.com", "- Indeed.com", "Indeed.com", "Indeed",
        "· GitHub", "- GitHub", "GitHub"
    ]:
        cleaned = cleaned.replace(suffix, "").strip()
    
    # Sometimes search engines stitch multiple profiles separated by "..."
    if "..." in cleaned:
        cleaned = cleaned.split("...")[0].strip()

    # Split by primary separator
    parts = re.split(r"\s+[-–|:]\s+", cleaned)
    if len(parts) >= 2:
        name = parts[0].strip()
        headline = " - ".join(parts[1:]).strip()
    elif len(parts) == 1:
        name = parts[0].strip()
        headline = f"Professional on {platform}"
    else:
        name = "Candidate"
        headline = cleaned

    # Strip prefixes like "Resume - " or "Profile - "
    name = re.sub(r"^(?:Resume\s*[-:]?\s*|Profile\s*[-:]?\s*|CV\s*[-:]?\s*)", "", name, flags=re.IGNORECASE).strip()

    # Fallback name if it extracted a company or generic text
    if len(name.split()) > 4 or any(w in name.lower() for w in ["engineer", "developer", "technologies", "inc", "ltd", "corporation", "hiring", "jobs", "resumes"]):
        if platform == "LinkedIn":
            match = re.search(r"linkedin\.com/in/([^/?#]+)", url)
            if match:
                slug = match.group(1).split("-")
                clean_slug_parts = [p.capitalize() for p in slug if not p.isdigit() and len(p) > 1]
                if clean_slug_parts:
                    name = " ".join(clean_slug_parts[:2])
        elif platform == "GitHub":
            match = re.search(r"github\.com/([^/?#]+)", url)
            if match:
                name = match.group(1).replace("-", " ").title()

    if len(headline) > 140:
        headline = headline[:137] + "..."

    return name, headline, platform


def extract_location_from_text(text: str, default_loc: str = "") -> str:
    """Extract location mentions from profile snippet."""
    loc_patterns = [
        r"(?:Location|Based in|at)\s*:\s*([^·\n|]+)",
        r"(Bengaluru|Bangalore|Hyderabad|Pune|Mumbai|Delhi|Noida|Gurgaon|Ahmedabad|Chennai|Kolkata|Chandigarh|San Francisco|London|Remote|India)",
    ]
    for pat in loc_patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            return m.group(1).strip()
    return default_loc or "Location not specified"


def analyze_jd_for_sourcing(jd_text: str, role_hint: str = "", location: str = "") -> Dict[str, Any]:
    """Uses LLM to analyze JD and generate targeted multi-platform sourcing queries for active job seekers."""
    loc_clean = location.strip() if location and location.strip() else "India"
    location_term = f'"{loc_clean}"'
    prompt = JD_SOURCING_PROMPT.format(
        role_hint=role_hint or "Infer from JD",
        location_hint=loc_clean,
        jd_text=jd_text,
        location_term=location_term,
    )
    
    try:
        raw_res = _call_llm(prompt, system_prompt="You are an expert recruitment researcher specializing in multi-platform talent sourcing. Return valid JSON only.", is_json=True)
        clean_json = re.sub(r"^```(?:json)?\s*", "", raw_res.strip())
        clean_json = re.sub(r"\s*```$", "", clean_json.strip())
        data = json.loads(clean_json)

        role = data.get("job_title") or role_hint or "Software Developer"
        loc = data.get("location") or loc_clean
        skills = data.get("core_skills", [])
        seniority = data.get("seniority", "")

        query_details = generate_sourcing_queries(
            job_title=role,
            core_skills=skills,
            seniority_or_experience=seniority,
            location=loc,
            max_words=30,
        )

        data["search_queries"] = [q["query"] for q in query_details]
        data["query_details"] = query_details
        return data
    except Exception as e:
        logger.error(f"JD analysis error: {e}")
        role = role_hint or "Software Engineer"
        loc = loc_clean
        fallback_skills = ["Python", "Machine Learning", "FastAPI", "PostgreSQL"]
        query_details = generate_sourcing_queries(
            job_title=role,
            core_skills=fallback_skills,
            seniority_or_experience="Mid-Senior",
            location=loc,
            max_words=30,
        )
        return {
            "job_title": role,
            "seniority": "Mid-Senior",
            "location": loc,
            "core_skills": fallback_skills,
            "nice_to_have_skills": ["Docker", "AWS", "Git"],
            "brief_summary": f"Opening for {role} with relevant technical expertise.",
            "search_queries": [q["query"] for q in query_details],
            "query_details": query_details,
        }


def search_talent_profiles(
    queries: List[str],
    core_skills: Optional[List[str]] = None,
    location_filter: str = "",
    max_total: int = 20,
) -> List[Dict[str, Any]]:
    """Runs DuckDuckGo X-Ray search across multiple talent platforms (LinkedIn, Naukri, Indeed, GitHub)."""
    core_skills = core_skills or []
    seen_urls = set()
    candidates = []

    ddgs = DDGS()

    # Keywords signaling active job seekers
    ACTIVE_SEEKER_KEYWORDS = [
        "open to work",
        "actively looking",
        "immediate joiner",
        "serving notice",
        "notice period",
        "seeking opportunities",
        "available immediately",
        "ready to join",
        "looking for job",
        "seeking new roles",
    ]

    ALLOWED_PLATFORMS = ("linkedin.com/in/", "github.com", "naukri.com", "indeed.com")

    # Blacklist of non-profile or advertising URLs
    EXCLUDE_PATTERNS = [
        "aclick", "bing.com/aclick", "doubleclick",
        "/jobs/", "/job-search/", "/search?", "/browse-jobs", "/company/",
        "/career-advice/", "/recruit/login", "/campus/career-guidance",
        "/topics/", "/trending", "/about",
    ]

    for q in queries:
        if len(candidates) >= max_total:
            break
        try:
            results = ddgs.text(q, max_results=10)
            for r in results:
                url = r.get("href") or ""
                if not url or not is_valid_candidate_url(url):
                    continue

                norm_url = re.sub(r"[?#].*$", "", url).rstrip("/").lower()
                if norm_url in seen_urls:
                    continue
                seen_urls.add(norm_url)

                raw_title = r.get("title") or ""
                snippet = r.get("body") or ""

                name, headline, platform = clean_candidate_name(raw_title, url)
                cand_loc = extract_location_from_text(snippet + " " + headline, location_filter)

                combined_text = (raw_title + " " + snippet + " " + headline).lower()
                matched = [s for s in core_skills if s.lower() in combined_text]
                
                # Check for active job seeker signals
                is_active_seeker = any(k in combined_text for k in ACTIVE_SEEKER_KEYWORDS)
                active_seeker_badge = ""
                if "immediate" in combined_text:
                    active_seeker_badge = "Immediate Joiner"
                elif "notice period" in combined_text or "serving notice" in combined_text:
                    active_seeker_badge = "Serving Notice Period"
                elif is_active_seeker:
                    active_seeker_badge = "Open to Work / Actively Looking"

                base_score = 65
                skill_bonus = min(len(matched) * 7, 25)
                active_bonus = 12 if is_active_seeker else 0
                fit_score = min(base_score + skill_bonus + active_bonus, 98)

                cand_id = f"cand_{len(candidates) + 1}_{abs(hash(norm_url)) % 10000}"

                candidates.append({
                    "id": cand_id,
                    "name": name,
                    "headline": headline,
                    "profile_url": url,
                    "snippet": snippet,
                    "location": cand_loc,
                    "matched_skills": matched,
                    "fit_score": fit_score,
                    "fit_tier": "Strong Match" if fit_score >= 80 else "Moderate Match",
                    "source": platform,
                    "is_active_seeker": is_active_seeker,
                    "active_seeker_badge": active_seeker_badge,
                })

            time.sleep(0.2)
        except Exception as e:
            # Soft log instead of alarming error
            logger.debug(f"Query notice for '{q}': {e}")
            continue

    # Automatic fallback if strict queries yielded few profiles
    if len(candidates) < 4:
        raw_role = "Software Engineer"
        if queries:
            m = re.search(r'"([^"]+)"', queries[0])
            if m:
                raw_role = m.group(1)
        # Strip parenthetical annotations like "(Firmware)"
        clean_extracted_role = re.sub(r"\s*[\(\[\{].*?[\)\]\}]\s*", " ", raw_role).strip()
        first_role = get_title_synonyms(clean_extracted_role or raw_role)[0]

        fallback_queries = [
            f'site:linkedin.com/in/ "{first_role}" "open to work"',
            f'site:linkedin.com/in/ "{first_role}" {location_filter or "India"}',
            f'site:github.com "{first_role}" {location_filter or "India"}',
        ]
        for fq in fallback_queries:
            if len(candidates) >= max_total:
                break
            try:
                time.sleep(0.2)
                fb_results = ddgs.text(fq, max_results=8)
                for r in fb_results:
                    url = r.get("href") or ""
                    if not url or not is_valid_candidate_url(url):
                        continue

                    norm_url = re.sub(r"[?#].*$", "", url).rstrip("/").lower()
                    if norm_url in seen_urls:
                        continue
                    seen_urls.add(norm_url)

                    raw_title = r.get("title") or ""
                    snippet = r.get("body") or ""
                    name, headline, platform = clean_candidate_name(raw_title, url)
                    cand_loc = extract_location_from_text(snippet + " " + headline, location_filter)
                    combined_text = (raw_title + " " + snippet + " " + headline).lower()
                    matched = [s for s in core_skills if s.lower() in combined_text]
                    is_active_seeker = any(k in combined_text for k in ACTIVE_SEEKER_KEYWORDS)
                    active_seeker_badge = "Open to Work / Actively Looking" if is_active_seeker else ""

                    fit_score = min(70 + len(matched) * 6 + (10 if is_active_seeker else 0), 95)
                    cand_id = f"cand_{len(candidates) + 1}_{abs(hash(norm_url)) % 10000}"

                    candidates.append({
                        "id": cand_id,
                        "name": name,
                        "headline": headline,
                        "profile_url": url,
                        "snippet": snippet,
                        "location": cand_loc,
                        "matched_skills": matched,
                        "fit_score": fit_score,
                        "fit_tier": "Strong Match" if fit_score >= 80 else "Moderate Match",
                        "source": platform,
                        "is_active_seeker": is_active_seeker,
                        "active_seeker_badge": active_seeker_badge,
                    })
                    if len(candidates) >= max_total:
                        break
            except Exception as e:
                logger.debug(f"Fallback notice for '{fq}': {e}")
                continue

    # Sort candidates by urgency tier (Immediate Joiner > Serving Notice > Actively Looking > Fit Score)
    def _rank_urgency(cand):
        badge = (cand.get("active_seeker_badge") or "").lower()
        if "immediate" in badge:
            return 4
        elif "notice" in badge or "serving" in badge or "lwd" in badge:
            return 3
        elif "actively looking" in badge or "seeking" in badge:
            return 2
        elif cand.get("is_active_seeker"):
            return 1
        return 0

    candidates.sort(key=lambda c: (_rank_urgency(c), c.get("fit_score", 0)), reverse=True)
    return candidates


def generate_outreach_pitch(
    candidate: Dict[str, Any],
    job_title: str,
    jd_summary: str,
    company_name: str = "Our Engineering Team",
) -> Dict[str, Any]:
    """Generates personalized multi-channel outreach pitches for a prospect."""
    matched_str = ", ".join(candidate.get("matched_skills", [])) or "Embedded Firmware development"
    
    prompt = OUTREACH_PROMPT.format(
        company_name=company_name,
        job_title=job_title,
        jd_summary=jd_summary,
        candidate_name=candidate.get("name", "there"),
        candidate_headline=candidate.get("headline", ""),
        candidate_snippet=candidate.get("snippet", ""),
        matched_skills=matched_str,
    )

    try:
        raw_res = _call_llm(prompt, system_prompt="You are an expert tech recruiter writing warm, personalized outreach. Return JSON only.", is_json=True)
        clean_json = re.sub(r"^```(?:json)?\s*", "", raw_res.strip())
        clean_json = re.sub(r"\s*```$", "", clean_json.strip())
        return json.loads(clean_json)
    except Exception as e:
        logger.error(f"Error generating pitch: {e}")
        name = candidate.get("name", "there")
        return {
            "linkedin_note": f"Hi {name}, I saw your strong experience in {matched_str}. We are hiring a {job_title} at {company_name} and your profile stood out. Would love to connect and share details!",
            "email_subject": f"Exciting {job_title} Opportunity @ {company_name} - {name}",
            "email_body": f"Hi {name},\n\nI hope you're doing well. I came across your profile and was impressed by your expertise in {matched_str}.\n\nWe are actively looking for a {job_title} to join {company_name}. Based on your background, your experience aligns well with what we are building.\n\nWould you be open to a quick 10-minute introductory conversation this week? You can also reply directly with your updated CV.\n\nLooking forward to hearing from you!\n\nBest regards,\nTalent Acquisition Team\n{company_name}",
            "whatsapp_dm": f"Hi {name}! Hope you're having a productive week. I'm reaching out from {company_name} regarding an open {job_title} role that matches your background in {matched_str}. If you're open to exploring new opportunities, could you share your updated resume? Happy to share the full job description!"
        }
