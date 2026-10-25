"""
Modular, pure query generation engine and URL validator for talent sourcing.
Produces high-precision Google X-Ray sourcing queries across LinkedIn, Naukri/Indeed,
GitHub, and Public Resumes/CVs.
"""

import re
import urllib.parse
from typing import List, Dict, Any, Optional, Tuple, Set


# ==============================================================================
# Role Synonyms Configuration Map
# ==============================================================================

ROLE_SYNONYM_MAP: Dict[str, Dict[str, Any]] = {
    "ai_ml": {
        "keywords": [
            "ai", "artificial intelligence", "machine learning", "ml",
            "nlp", "natural language", "deep learning", "data scientist",
            "computer vision", "llm", "generative ai"
        ],
        "synonyms": [
            "AI Engineer",
            "AI Developer",
            "ML Engineer",
            "Machine Learning Engineer",
            "NLP Engineer",
            "Data Scientist",
        ],
        "generic_skills": {
            "artificial intelligence",
            "machine learning",
            "ai",
            "ml",
            "data science",
            "deep learning engineer",
        },
        "default_skills": ["Python", "Machine Learning", "Deep Learning"],
    },
    "frontend": {
        "keywords": [
            "frontend", "front end", "front-end", "react", "vue", "angular",
            "ui developer", "web developer", "javascript developer"
        ],
        "synonyms": [
            "Frontend Developer",
            "Frontend Engineer",
            "React Developer",
            "UI Engineer",
            "Web Developer",
        ],
        "generic_skills": {
            "frontend", "front end", "web development", "ui", "user interface", "coding"
        },
        "default_skills": ["React", "JavaScript", "TypeScript"],
    },
    "backend": {
        "keywords": [
            "backend", "back end", "back-end", "python developer", "node developer",
            "java developer", "golang developer", "api developer"
        ],
        "synonyms": [
            "Backend Developer",
            "Backend Engineer",
            "Software Engineer",
            "API Engineer",
            "Systems Engineer",
        ],
        "generic_skills": {
            "backend", "back end", "software development", "programming"
        },
        "default_skills": ["Python", "Node.js", "Java", "SQL"],
    },
    "fullstack": {
        "keywords": [
            "fullstack", "full stack", "full-stack", "mern", "mean", "full stack developer"
        ],
        "synonyms": [
            "Full Stack Developer",
            "Full Stack Engineer",
            "Software Engineer",
            "Web Application Developer",
        ],
        "generic_skills": {
            "fullstack", "full stack", "web development", "software development"
        },
        "default_skills": ["React", "Node.js", "TypeScript"],
    },
    "devops": {
        "keywords": [
            "devops", "cloud engineer", "sre", "site reliability", "infrastructure",
            "platform engineer", "kubernetes", "aws engineer"
        ],
        "synonyms": [
            "DevOps Engineer",
            "Cloud Engineer",
            "Site Reliability Engineer",
            "SRE",
            "Platform Engineer",
        ],
        "generic_skills": {
            "devops", "cloud", "infrastructure", "ci/cd"
        },
        "default_skills": ["Docker", "Kubernetes", "AWS", "CI/CD"],
    },
    "data_engineering": {
        "keywords": [
            "data engineer", "data engineering", "big data", "etl developer",
            "data warehouse", "spark developer"
        ],
        "synonyms": [
            "Data Engineer",
            "Big Data Engineer",
            "ETL Developer",
            "Data Platform Engineer",
        ],
        "generic_skills": {
            "data engineering", "big data", "etl", "data"
        },
        "default_skills": ["SQL", "Python", "Spark", "ETL"],
    },
    "embedded_firmware": {
        "keywords": [
            "firmware", "embedded", "rtos", "microcontroller", "mcu", "soc",
            "device driver", "bare metal", "embedded c", "embedded software",
            "iot firmware", "stm32", "esp32", "arm cortex"
        ],
        "synonyms": [
            "Firmware Engineer",
            "Embedded Software Engineer",
            "Firmware Developer",
            "Embedded Systems Engineer",
            "Embedded Engineer",
            "Senior Firmware Engineer",
        ],
        "generic_skills": {
            "firmware", "embedded", "hardware", "engineering"
        },
        "default_skills": ["C", "C++", "RTOS", "Embedded Linux", "Microcontrollers"],
    },
}

# Unified availability signals group
SIGNALS_GROUP = '("open to work" OR "immediate joiner" OR "notice period" OR "actively looking" OR "looking for opportunities")'

# Universal recruiter and job-posting exclusions
STANDARD_EXCLUSIONS = '-hiring -recruiter -"we are hiring" -"job description" -jobs'

# Major India tech hubs
INDIA_CITIES = ["Bengaluru", "Hyderabad", "Pune", "Mumbai", "Delhi", "Chennai"]


# ==============================================================================
# Pure Helper Functions
# ==============================================================================

def find_role_family(job_title: str) -> Optional[str]:
    """Finds the role family for a job title using keyword matching."""
    if not job_title:
        return None
    t_lower = job_title.lower()
    for family, config in ROLE_SYNONYM_MAP.items():
        for kw in config["keywords"]:
            # Match whole words or clean boundaries
            if re.search(r"\b" + re.escape(kw) + r"\b", t_lower):
                return family
    return None


def get_title_synonyms(job_title: str) -> List[str]:
    """
    Expands job title to role family synonyms.
    Falls back to [job_title] if no role family matches.
    """
    clean_title = (job_title or "").strip()
    if not clean_title:
        return ["Software Engineer"]

    family = find_role_family(clean_title)
    if not family:
        return [clean_title]

    synonyms = list(ROLE_SYNONYM_MAP[family]["synonyms"])
    # If the user typed a multi-word specific clean title without brackets/parentheses, keep it at front.
    # If single-word category like "firmware" or title with parenthetical notes like "(Firmware)", 
    # the curated role family synonyms are much better and produce far higher search yield.
    has_parens = bool(re.search(r"[\(\[\{]", clean_title))
    if not has_parens and len(clean_title.split()) > 1 and clean_title not in synonyms:
        synonyms.insert(0, clean_title)
    return synonyms


def filter_generic_skills(skills: List[str], job_title: str) -> List[str]:
    """
    Drops generic skills that are already covered by the title or role family.
    Returns specific technical skills preserving order.
    """
    if not skills:
        return []

    family = find_role_family(job_title)
    generic_set: Set[str] = set()
    if family:
        generic_set.update(ROLE_SYNONYM_MAP[family].get("generic_skills", set()))

    # Also treat words in the title itself as generic
    title_words = {w.lower() for w in re.findall(r"\w+", job_title.lower()) if len(w) > 2}
    generic_set.update(title_words)

    filtered = []
    seen = set()
    for s in skills:
        s_clean = s.strip()
        s_lower = s_clean.lower()
        if not s_clean or s_lower in seen:
            continue
        # Drop if it is in generic set or matches generic title phrases
        if s_lower in generic_set:
            continue
        # Drop if skill is simply "engineer", "developer", "technology"
        if s_lower in {"engineer", "developer", "technology", "technologies", "software"}:
            continue
        filtered.append(s_clean)
        seen.add(s_lower)

    return filtered


def rotate_skills(skills: List[str], variant_idx: int, count: int = 3) -> List[str]:
    """
    Selects up to `count` skills from `skills`, rotating based on `variant_idx`.
    """
    if not skills:
        return []
    if len(skills) <= count:
        return skills

    # Rotate starting offset
    offset = (variant_idx * 2) % len(skills)
    rotated = skills[offset:] + skills[:offset]
    return rotated[:count]


def parse_experience_band(seniority_or_exp: str) -> Optional[str]:
    """
    Derives an experience OR group from seniority/experience text.
    E.g. "3-5 years" -> '("3 years" OR "4 years" OR "5 years")'
    E.g. "5+ years" -> '("5 years" OR "6 years" OR "5+ years")'
    """
    if not seniority_or_exp:
        return None

    text = seniority_or_exp.lower()

    # Match range e.g. "3-5", "3 to 5", "3 - 5 years"
    range_match = re.search(r"(\d{1,2})\s*(?:-|to)\s*(\d{1,2})\s*(?:years|yrs)?", text)
    if range_match:
        start = int(range_match.group(1))
        end = int(range_match.group(2))
        if 0 < start <= end <= 20 and (end - start) <= 5:
            years = [f'"{y} years"' for y in range(start, end + 1)]
            return f"({' OR '.join(years)})"

    # Match single plus e.g. "5+ years" or "5 years"
    plus_match = re.search(r"(\d{1,2})\+?\s*(?:years|yrs)", text)
    if plus_match:
        val = int(plus_match.group(1))
        if 0 < val <= 20:
            return f'("{val} years" OR "{val}+ years")'

    return None


def expand_location(location: str, include_all_cities: bool = True) -> str:
    """
    If location is 'India', expands to major tech hubs.
    Otherwise returns quoted location.
    """
    loc_clean = (location or "").strip()
    if not loc_clean:
        loc_clean = "India"

    if loc_clean.lower() == "india" or "india" in loc_clean.lower():
        if include_all_cities:
            city_terms = [f'"{c}"' for c in INDIA_CITIES]
            return f'("India" OR {" OR ".join(city_terms)})'
        return '"India"'

    return f'"{loc_clean}"'


def format_or_group(items: List[str], prefix: str = "", quote: bool = True) -> str:
    """
    Formats a list of strings into an OR group.
    E.g. ["Python", "NLP"] -> '("Python" OR "NLP")'
    E.g. prefix="intitle:", items=["AI Engineer", "ML Engineer"] -> '(intitle:"AI Engineer" OR intitle:"ML Engineer")'
    """
    if not items:
        return ""
    formatted = []
    for it in items:
        clean = it.strip().strip('"')
        term = f'"{clean}"' if quote else clean
        if prefix:
            term = f"{prefix}{term}"
        formatted.append(term)
    if len(formatted) == 1:
        return formatted[0]
    return f"({' OR '.join(formatted)})"


def count_words(query: str) -> int:
    """Counts the number of space-separated words in a query string."""
    return len(query.strip().split())


def build_and_trim_query(
    site_prefix: str,
    titles: List[str],
    signals: str,
    skills: List[str],
    location_str: str,
    exclusions: str,
    experience_group: Optional[str] = None,
    max_words: int = 30,
    intitle_titles: bool = False,
    extra_terms: str = "",
) -> str:
    """
    Constructs a query and trims it if exceeding `max_words` in strict priority order:
    1. Drop experience group
    2. Drop extra cities from location (reduce to base location)
    3. Drop extra synonyms (reduce titles count)
    4. Drop secondary skills
    Never drops site_prefix.
    """
    curr_exp = experience_group
    curr_loc = location_str
    curr_titles = list(titles)
    curr_skills = list(skills)
    curr_signals = signals
    curr_exclusions = exclusions

    def assemble() -> str:
        parts = [site_prefix]
        if extra_terms:
            parts.append(extra_terms)
        if curr_titles:
            if intitle_titles:
                parts.append(format_or_group(curr_titles, prefix="intitle:"))
            else:
                parts.append(format_or_group(curr_titles))
        if curr_signals:
            parts.append(curr_signals)
        if curr_skills:
            parts.append(format_or_group(curr_skills))
        if curr_loc:
            parts.append(curr_loc)
        if curr_exp:
            parts.append(curr_exp)
        if curr_exclusions:
            parts.append(curr_exclusions)
        return " ".join(p for p in parts if p).strip()

    q = assemble()
    if count_words(q) <= max_words:
        return q

    # Step 1: Drop experience group
    if curr_exp:
        curr_exp = None
        q = assemble()
        if count_words(q) <= max_words:
            return q

    # Step 2: Drop extra cities (reduce India cities group down to '"India"')
    if '("India" OR' in curr_loc:
        curr_loc = '"India"'
        q = assemble()
        if count_words(q) <= max_words:
            return q

    # Step 3: Drop extra synonyms down to top 2 or 1
    while len(curr_titles) > 2:
        curr_titles.pop()
        q = assemble()
        if count_words(q) <= max_words:
            return q

    if len(curr_titles) > 1:
        curr_titles = curr_titles[:1]
        q = assemble()
        if count_words(q) <= max_words:
            return q

    # Step 4: Drop extra skills down to 1
    while len(curr_skills) > 1:
        curr_skills.pop()
        q = assemble()
        if count_words(q) <= max_words:
            return q

    # Step 5: Compact exclusions if still over limit
    if ' -"we are hiring"' in curr_exclusions:
        curr_exclusions = curr_exclusions.replace(' -"we are hiring"', '')
        q = assemble()
        if count_words(q) <= max_words:
            return q

    # Step 6: Compact signals if still over limit
    if ' OR "looking for opportunities"' in curr_signals:
        curr_signals = curr_signals.replace(' OR "looking for opportunities"', '')
        q = assemble()
        if count_words(q) <= max_words:
            return q

    # Step 7: Drop skill completely if still over limit
    if curr_skills:
        curr_skills = []
        q = assemble()
        if count_words(q) <= max_words:
            return q

    return q


# ==============================================================================
# Main Sourcing Query Builder Pure Function
# ==============================================================================

def generate_sourcing_queries(
    job_title: str,
    core_skills: Optional[List[str]] = None,
    seniority_or_experience: str = "",
    location: str = "India",
    max_words: int = 30,
) -> List[Dict[str, Any]]:
    """
    Pure function that generates 5 high-precision Google X-ray sourcing queries.
    Channels:
    1. LinkedIn - Broad
    2. LinkedIn - Headline Targeted
    3. Naukri & Indeed - Resumes & Candidates (job posts excluded)
    4. GitHub - Developer Profiles
    5. Public Resumes - (filetype:pdf OR filetype:docx)
    """
    job_title = (job_title or "Software Engineer").strip()
    core_skills = core_skills or []
    location = (location or "India").strip()

    # 1. Expand title synonyms
    all_synonyms = get_title_synonyms(job_title)

    # 2. Filter generic skills and get specific remaining skills
    specific_skills = filter_generic_skills(core_skills, job_title)
    if not specific_skills and core_skills:
        # If all were dropped as generic, take the top 2
        specific_skills = core_skills[:2]
    if not specific_skills:
        family = find_role_family(job_title)
        if family and "default_skills" in ROLE_SYNONYM_MAP.get(family, {}):
            specific_skills = list(ROLE_SYNONYM_MAP[family]["default_skills"][:2])
        else:
            specific_skills = ["Python"]

    # 3. Derive optional experience group
    exp_group = parse_experience_band(seniority_or_experience)

    # 4. Location strings
    loc_expanded = expand_location(location, include_all_cities=True)

    # Build the 5 queries with rotated skills
    results = []

    # Channel 1: LinkedIn Broad
    # site:linkedin.com/in/ + titles + signals + skills + location + exclusions
    skills_1 = rotate_skills(specific_skills, variant_idx=0, count=3)
    q1 = build_and_trim_query(
        site_prefix="site:linkedin.com/in/",
        titles=all_synonyms[:3],
        signals=SIGNALS_GROUP,
        skills=skills_1,
        location_str=loc_expanded,
        exclusions=STANDARD_EXCLUSIONS,
        experience_group=exp_group,
        max_words=max_words,
        intitle_titles=False,
    )
    results.append({
        "platform": "LinkedIn",
        "channel": "LinkedIn - Broad",
        "signal": "Active Job Seekers",
        "query": q1,
        "word_count": count_words(q1),
        "google_url": f"https://www.google.com/search?q={urllib.parse.quote_plus(q1)}&tbs=qdr:y",
    })

    # Channel 2: LinkedIn Headline Targeted
    # site:linkedin.com/in/ + intitle: on 2-3 titles + "open to work" + city OR group
    q2 = build_and_trim_query(
        site_prefix="site:linkedin.com/in/",
        titles=all_synonyms[:3],
        signals='"open to work"',
        skills=[],  # Headline queries focus on title and open to work
        location_str=loc_expanded,
        exclusions=STANDARD_EXCLUSIONS,
        experience_group=None,
        max_words=max_words,
        intitle_titles=True,
    )
    results.append({
        "platform": "LinkedIn",
        "channel": "LinkedIn - Headline Targeted",
        "signal": "Open to Work in Headline",
        "query": q2,
        "word_count": count_words(q2),
        "google_url": f"https://www.google.com/search?q={urllib.parse.quote_plus(q2)}&tbs=qdr:y",
    })

    # Channel 3: Naukri & Indeed - Resumes & Candidates
    # (site:naukri.com OR site:indeed.com/r/) + (intitle:resume OR intitle:cv OR "resume") + titles + skills + location + exclusions
    skills_3 = rotate_skills(specific_skills, variant_idx=1, count=2)
    q3 = build_and_trim_query(
        site_prefix="(site:naukri.com OR site:indeed.com/r/)",
        titles=all_synonyms[:2],
        signals='(intitle:resume OR intitle:cv OR "resume")',
        skills=skills_3,
        location_str=loc_expanded,
        exclusions='-jobs -job -"job description" -"we are hiring" -hiring',
        experience_group=exp_group,
        max_words=max_words,
        intitle_titles=False,
    )
    results.append({
        "platform": "Naukri / Indeed",
        "channel": "Naukri & Indeed - Resumes",
        "signal": "Active Resumes & Candidates",
        "query": q3,
        "word_count": count_words(q3),
        "google_url": f"https://www.google.com/search?q={urllib.parse.quote_plus(q3)}&tbs=qdr:y",
    })

    # Channel 4: GitHub - Developer Profiles
    # site:github.com + titles + skills + India + availability signals
    skills_4 = rotate_skills(specific_skills, variant_idx=2, count=2)
    q4 = build_and_trim_query(
        site_prefix="site:github.com",
        titles=all_synonyms[:2],
        signals=SIGNALS_GROUP,
        skills=skills_4,
        location_str='"India"',
        exclusions='-hiring -"we are hiring" -jobs',
        experience_group=None,
        max_words=max_words,
        intitle_titles=False,
    )
    results.append({
        "platform": "GitHub",
        "channel": "GitHub - Developer Profiles",
        "signal": "Developer Profiles & Repos",
        "query": q4,
        "word_count": count_words(q4),
        "google_url": f"https://www.google.com/search?q={urllib.parse.quote_plus(q4)}&tbs=qdr:y",
    })

    # Channel 5: Public Resumes (PDF / DOCX)
    # (intitle:resume OR intitle:CV) + skills + location + (filetype:pdf OR filetype:docx) + exclusions
    skills_5 = rotate_skills(specific_skills, variant_idx=3, count=2)
    q5 = build_and_trim_query(
        site_prefix="(intitle:resume OR intitle:CV)",
        titles=all_synonyms[:2],
        signals="(filetype:pdf OR filetype:docx)",
        skills=skills_5,
        location_str=loc_expanded,
        exclusions=STANDARD_EXCLUSIONS,
        experience_group=exp_group,
        max_words=max_words,
        intitle_titles=False,
    )
    results.append({
        "platform": "Public Resumes",
        "channel": "Public Resumes - PDF/DOCX",
        "signal": "Direct Resumes & CVs",
        "query": q5,
        "word_count": count_words(q5),
        "google_url": f"https://www.google.com/search?q={urllib.parse.quote_plus(q5)}&tbs=qdr:y",
    })

    return results


# ==============================================================================
# URL Validator & Filter Pure Function
# ==============================================================================

def is_valid_candidate_url(url: str) -> bool:
    """
    Validates candidate URLs.
    Keeps:
    - LinkedIn: linkedin.com/in/<slug> with no extra sub-paths
    - GitHub: github.com/<username> with no extra sub-paths (no repos, topics, pulls)
    - Indeed: indeed.com/r/<id> or profile.indeed.com
    - Naukri: candidate profiles or resumes (not job postings)
    - Public Resumes: PDF/DOCX or direct CV documents
    Drops:
    - Company pages, job postings, topics, pulls, search results, ads
    """
    if not url or not isinstance(url, str):
        return False

    clean_url = re.sub(r"[?#].*$", "", url.strip()).rstrip("/")
    u_lower = clean_url.lower()

    # Drop obvious ad / search result listings
    bad_fragments = [
        "aclick", "doubleclick", "/jobs/", "/job-search/", "/search?", "/browse-jobs",
        "/company/", "/companies/", "/career-advice/", "/campus/", "/login",
        "/feed/", "/posts/", "/pulse/", "/school/", "/learning/", "/viewjob",
        "/topics/", "/trending", "/about", "/pricing", "/features/", "/pulls", "/issues"
    ]
    if any(b in u_lower for b in bad_fragments):
        return False

    # LinkedIn: must match linkedin.com/in/<slug>
    if "linkedin.com" in u_lower:
        m = re.search(r"linkedin\.com/in/([^/]+)$", u_lower)
        return bool(m and len(m.group(1)) > 1)

    # GitHub: must match github.com/<username> with exactly 1 segment
    if "github.com" in u_lower:
        m = re.search(r"github\.com/([^/]+)$", u_lower)
        if not m:
            return False
        username = m.group(1)
        # Exclude reserved words
        reserved = {
            "about", "features", "pricing", "security", "team", "enterprise",
            "explore", "marketplace", "sponsors", "login", "signup", "settings",
            "contact", "topics", "collections", "trending", "orgs", "stars"
        }
        return username not in reserved and len(username) > 1

    # Indeed: must be /r/<slug> or resume path
    if "indeed.com" in u_lower:
        return bool(re.search(r"indeed\.com/r/[^?#]+", u_lower) or "resume" in u_lower)

    # Naukri: must not be a job listing and have profile/resume
    if "naukri.com" in u_lower:
        return bool("profile" in u_lower or "resume" in u_lower or "cv" in u_lower)

    # Public Resumes: must end with .pdf or .docx or have cv/resume
    if u_lower.endswith(".pdf") or u_lower.endswith(".docx"):
        return True

    return False
