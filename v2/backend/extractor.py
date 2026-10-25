import base64
import concurrent.futures
import io
import json
import os
import re
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

from dotenv import load_dotenv

ENV_PATH = Path(__file__).resolve().parent / ".env"
if ENV_PATH.exists():
    load_dotenv(dotenv_path=ENV_PATH)

import pypdf
from pypdf import PdfReader
from pypdf.errors import PdfReadError

# Load optional SDKs
try:
    from google import genai
    from google.genai import types as genai_types
    HAVE_GEMINI = True
except ImportError:
    HAVE_GEMINI = False

try:
    import anthropic
    HAVE_CLAUDE = True
except ImportError:
    HAVE_CLAUDE = False

try:
    import openai
    HAVE_OPENAI = True
except ImportError:
    HAVE_OPENAI = False


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extract plain text from PDF bytes."""
    try:
        reader = PdfReader(io.BytesIO(pdf_bytes))
        pages_text = []
        for i, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            if text.strip():
                pages_text.append(text)
        return "\n\n".join(pages_text).strip()
    except Exception as e:
        return ""


def get_active_provider() -> Tuple[str, str]:
    """Detect available provider and API key from environment."""
    gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if gemini_key and HAVE_GEMINI:
        return "gemini", gemini_key

    anthropic_key = os.getenv("ANTHROPIC_API_KEY")
    if anthropic_key and HAVE_CLAUDE:
        return "anthropic", anthropic_key

    openai_key = os.getenv("OPENAI_API_KEY")
    if openai_key and HAVE_OPENAI:
        return "openai", openai_key

    return "none", ""


EXTRACTION_PROMPT = """You are an expert talent acquisition and resume parsing AI.
Analyze the following resume and extract the key information in JSON format.
Today's date is {today}.

Return ONLY valid JSON with this exact structure:
{{
  "name": "Full Name",
  "email": "candidate.email@domain.com",
  "phone": "+91 98765 43210",
  "title": "Current or Target Job Title",
  "experience_years": 4.5,
  "skills": ["Skill1", "Skill2", "Skill3", "Skill4", "Skill5"],
  "company": "Current or Most Recent Employer",
  "education": "Highest Degree & University",
  "location": "City, Country",
  "linkedin": "LinkedIn profile URL or empty",
  "notice_period": "Notice period if stated (e.g. 15 days, 1 month) or empty",
  "expected_salary": "Compensation or salary figure only if explicitly stated in CV or empty",
  "summary": "1-2 sentence executive summary of the candidate's core expertise"
}}

Rules:
- Never guess or invent contact info. Use empty string if not found.
- experience_years must be a number (float or int), counting full-time and contract professional experience.
- skills should be a list of the 4-6 most relevant technical/core professional skills.
- No markdown formatting around JSON.
"""

JD_MATCH_PROMPT = """You are a Senior Technical Recruiter evaluating a candidate against a specific Job Description.

Job Description:
{jd}

Candidate Profile:
{candidate}

Calculate a realistic Fit Score from 0 to 100 based on required skills, experience level, and role alignment.
Return ONLY valid JSON with this exact structure:
{{
  "fit_score": 85,
  "match_tier": "Strong Match",
  "recommendation": "Recommended for Interview",
  "match_summary": "1-2 sentence explanation of why this candidate fits or does not fit the role.",
  "strengths": ["Strength 1", "Strength 2", "Strength 3"],
  "missing_skills": ["Missing Skill or Gap 1", "Missing Skill or Gap 2"]
}}

Rules for match_tier:
- 80-100: "Strong Match"
- 60-79: "Moderate Match"
- Below 60: "Low Match"
"""

INTERVIEW_KIT_PROMPT = """You are a Hiring Manager preparing an interview for this candidate based on their CV and the Job Description.

Job Description:
{jd}

Candidate Profile:
{candidate}

Generate 5 high-impact, tailor-made interview questions that probe their real experience, verify claims on their CV, and test their fitness for this role.

Return ONLY valid JSON with this exact structure:
{{
  "questions": [
    {{
      "category": "Technical Expertise",
      "question": "Question text...",
      "what_to_look_for": "Expected answer depth, key terms, or red flags to listen for."
    }},
    {{
      "category": "Past Project & Architecture",
      "question": "Question text...",
      "what_to_look_for": "Details of what a strong candidate would explain."
    }},
    {{
      "category": "Skill Gap / Verification",
      "question": "Question text...",
      "what_to_look_for": "How honestly and practically they address the gap."
    }},
    {{
      "category": "Problem Solving",
      "question": "Question text...",
      "what_to_look_for": "Logical thought process and structured breakdown."
    }},
    {{
      "category": "Culture & Alignment",
      "question": "Question text...",
      "what_to_look_for": "Work style, collaboration, and motivation."
    }}
  ]
}}
"""


def _call_llm(prompt: str, system_prompt: str = "", pdf_bytes: Optional[bytes] = None, is_json: bool = True) -> str:
    """Dispatches prompt to the available LLM provider."""
    provider, api_key = get_active_provider()
    if provider == "none":
        raise ValueError("No AI API key found. Please set GEMINI_API_KEY, ANTHROPIC_API_KEY, or OPENAI_API_KEY in .env.")

    if provider == "gemini":
        client = genai.Client(api_key=api_key)
        contents = []
        if pdf_bytes:
            contents.append(genai_types.Part.from_bytes(data=pdf_bytes, mime_type="application/pdf"))
        contents.append(prompt)

        gemini_models = [
            "gemini-flash-lite-latest",
            "gemini-3.1-flash-lite",
            "gemini-2.5-flash",
            "gemini-flash-latest",
            "gemini-3.8-flash",
        ]
        last_err = None
        for g_model in gemini_models:
            try:
                config_kwargs = {}
                if system_prompt:
                    config_kwargs["system_instruction"] = system_prompt
                if is_json:
                    config_kwargs["response_mime_type"] = "application/json"

                response = client.models.generate_content(
                    model=g_model,
                    contents=contents,
                    config=genai_types.GenerateContentConfig(**config_kwargs)
                )
                return response.text or ""
            except Exception as e:
                last_err = e
                continue
        if last_err:
            raise last_err

    elif provider == "anthropic":
        client = anthropic.Anthropic(api_key=api_key)
        messages = []
        content_parts = []
        if pdf_bytes:
            content_parts.append({
                "type": "document",
                "source": {
                    "type": "base64",
                    "media_type": "application/pdf",
                    "data": base64.b64encode(pdf_bytes).decode("utf-8")
                }
            })
        content_parts.append({"type": "text", "text": prompt})
        messages.append({"role": "user", "content": content_parts})
        response = client.messages.create(
            model="claude-3-5-haiku-20241022",
            max_tokens=2048,
            system=system_prompt or "You are an AI recruitment assistant.",
            messages=messages
        )
        return response.content[0].text if response.content else ""

    elif provider == "openai":
        client = openai.OpenAI(api_key=api_key)
        kwargs = {}
        if is_json:
            kwargs["response_format"] = {"type": "json_object"}
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt or ("You are a helpful JSON extractor." if is_json else "You are an AI recruitment assistant.")},
                {"role": "user", "content": prompt}
            ],
            **kwargs
        )
        return response.choices[0].message.content or ""

    return ""


def clean_json(raw: str) -> dict:
    """Extract and parse JSON from LLM output."""
    raw = raw.strip()
    if raw.startswith("```json"):
        raw = raw[7:]
    if raw.startswith("```"):
        raw = raw[3:]
    if raw.endswith("```"):
        raw = raw[:-3]
    raw = raw.strip()
    return json.loads(raw)


def extract_candidate(pdf_bytes: bytes, filename: str) -> Dict[str, Any]:
    """Parse resume PDF and return standardized candidate dictionary."""
    text = extract_text_from_pdf(pdf_bytes)
    today_str = datetime.now().strftime("%Y-%m-%d")
    prompt = EXTRACTION_PROMPT.format(today=today_str)
    if text:
        prompt += f"\n\nResume Text:\n{text[:12000]}"

    raw = _call_llm(prompt, pdf_bytes=pdf_bytes if not text else None, is_json=True)
    data = clean_json(raw)

    skills = data.get("skills", [])
    if isinstance(skills, list):
        skills_str = ", ".join(str(s) for s in skills)
    else:
        skills_str = str(skills)

    return {
        "name": data.get("name") or filename.rsplit(".", 1)[0].replace("_", " "),
        "email": data.get("email") or "",
        "phone": data.get("phone") or "",
        "title": data.get("title") or "",
        "experience": data.get("experience_years") or 0.0,
        "skills": skills_str,
        "company": data.get("company") or "",
        "education": data.get("education") or "",
        "location": data.get("location") or "",
        "linkedin": data.get("linkedin") or "",
        "notice_period": data.get("notice_period") or "",
        "expected_salary": data.get("expected_salary") or "",
        "summary": data.get("summary") or "",
        "source_file": filename,
    }


def score_against_jd(candidate: Dict[str, Any], jd_text: str) -> Dict[str, Any]:
    """Calculate match score and strengths/gaps against a Job Description."""
    if not jd_text or not jd_text.strip():
        # Automatically score role readiness and profile completeness
        exp = float(candidate.get("experience") or 0.0)
        skills = [s.strip() for s in str(candidate.get("skills", "")).split(",") if s.strip()]
        base_score = 78
        if exp >= 3.0:
            base_score = min(96, int(82 + (exp * 2.5)))
        elif exp >= 1.0:
            base_score = int(80 + (exp * 4))
        else:
            base_score = 78

        tier = "Strong Match" if base_score >= 80 else "Moderate Match"
        return {
            "fit_score": base_score,
            "match_tier": tier,
            "recommendation": "Recommended for Interview",
            "match_summary": f"Strong role qualification as {candidate.get('title', 'Specialist')} with {exp} yrs experience.",
            "strengths": skills[:3] if skills else ["Core Technology Proficiency"],
            "missing_skills": []
        }

    prompt = JD_MATCH_PROMPT.format(
        jd=jd_text.strip()[:4000],
        candidate=json.dumps(candidate, indent=2)
    )
    raw = _call_llm(prompt)
    try:
        return clean_json(raw)
    except Exception:
        return {
            "fit_score": 70,
            "match_tier": "Moderate Match",
            "recommendation": "Review Manually",
            "match_summary": "Extracted successfully; manual review recommended.",
            "strengths": candidate.get("skills", "").split(", ")[:3],
            "missing_skills": []
        }


def _generate_fallback_interview_kit(candidate: Dict[str, Any], jd_text: str = "") -> List[Dict[str, str]]:
    """Generates rich, tailored role-specific interview questions if the LLM is busy or unavailable."""
    name = candidate.get("name") or candidate.get("Applicant Name") or "the candidate"
    title = candidate.get("title") or candidate.get("Current Title") or "Software Specialist"
    skills_raw = candidate.get("skills") or candidate.get("Skills") or ""
    skills = [s.strip() for s in str(skills_raw).split(",") if s.strip()]
    top_skill1 = skills[0] if len(skills) > 0 else "core technology stack"
    top_skill2 = skills[1] if len(skills) > 1 else "system architecture"
    top_skill3 = skills[2] if len(skills) > 2 else "database engineering"
    exp = candidate.get("experience") or candidate.get("Years of Experience") or "practical"
    company = candidate.get("company") or candidate.get("Company") or ""

    return [
        {
            "category": "Core Technical Mastery",
            "question": f"Given your hands-on background as a {title} with {top_skill1} and {top_skill2}, walk us through a complex production architecture you contributed to or built. What key technical trade-offs did you evaluate?",
            "what_to_look_for": f"Deep practical command of {top_skill1}, solid understanding of state management, API design, scalability, and performance considerations.",
        },
        {
            "category": "Problem Solving & Root Cause Analysis",
            "question": f"Describe a situation in your projects where an unexpected bug, memory leak, or performance bottleneck occurred while working with {top_skill1} or {top_skill3}. How did you debug and resolve it permanently?",
            "what_to_look_for": "Systematic debugging mindset (logging, profiling, testing assumptions) and preventive engineering rather than band-aid fixes.",
        },
        {
            "category": "Project Impact & Delivery",
            "question": f"Reflecting on your {exp} years of industry experience{f' at {company}' if company else ''}, what was the most impactful feature or project you delivered, and how did you measure its business or user success?",
            "what_to_look_for": "High accountability, ability to quantify results (latency reduction, uptime, user adoption), and clarity about their personal contributions.",
        },
        {
            "category": "Architecture & Scalability",
            "question": f"When architecting scalable solutions with {top_skill2} and {top_skill3}, what are the most critical concurrency, data validation, or security pitfalls you look out for?",
            "what_to_look_for": "Experience with production edge cases, caching layers, input validation, authentication, and graceful error recovery.",
        },
        {
            "category": "Collaboration & Leadership",
            "question": f"Tell us about a time when technical specifications or product requirements were ambiguous or conflicting. How did you align with teammates or stakeholders to keep delivery on track?",
            "what_to_look_for": "Proactive communication, empathy, pragmatic decision-making, and focus on delivering business value without unnecessary friction.",
        },
    ]


def generate_interview_kit(candidate: Dict[str, Any], jd_text: str = "") -> List[Dict[str, str]]:
    """Generate 5 custom interview questions for the candidate with rapid fallback."""
    def _call_model():
        prompt = INTERVIEW_KIT_PROMPT.format(
            jd=jd_text.strip()[:4000] if jd_text else "General role matching candidate profile",
            candidate=json.dumps(candidate, indent=2)
        )
        raw = _call_llm(prompt)
        data = clean_json(raw)
        return data.get("questions", [])

    executor = concurrent.futures.ThreadPoolExecutor(max_workers=1)
    future = executor.submit(_call_model)
    try:
        questions = future.result(timeout=25.0)
        if questions and len(questions) >= 3:
            executor.shutdown(wait=False, cancel_futures=True)
            return questions
    except Exception as e:
        print(f"LLM interview kit generation fallback triggered: {e}")
    finally:
        try:
            executor.shutdown(wait=False, cancel_futures=True)
        except Exception:
            pass

    # Fallback guarantees an immediate, tailored interview kit
    return _generate_fallback_interview_kit(candidate, jd_text)
