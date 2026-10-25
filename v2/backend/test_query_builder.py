"""
Unit tests for the query builder engine and URL validator.
Tests:
1. Title synonym expansion and fallback.
2. Skill filtering (dropping generic skills matching role) and rotation.
3. Word cap (<= 30 words) and trimming priority.
4. Candidate URL validation and filtering.
"""

import unittest
from query_builder import (
    get_title_synonyms,
    find_role_family,
    filter_generic_skills,
    rotate_skills,
    parse_experience_band,
    expand_location,
    count_words,
    build_and_trim_query,
    generate_sourcing_queries,
    is_valid_candidate_url,
)


class TestTitleSynonyms(unittest.TestCase):
    def test_ai_ml_title_expansion(self):
        synonyms = get_title_synonyms("AI Developer")
        self.assertIn("AI Engineer", synonyms)
        self.assertIn("ML Engineer", synonyms)
        self.assertIn("Machine Learning Engineer", synonyms)
        self.assertIn("NLP Engineer", synonyms)
        self.assertIn("Data Scientist", synonyms)

    def test_fallback_unmapped_title(self):
        synonyms = get_title_synonyms("Specialized Blockchain Cryptographer")
        self.assertEqual(synonyms, ["Specialized Blockchain Cryptographer"])

    def test_empty_title_fallback(self):
        synonyms = get_title_synonyms("")
        self.assertEqual(synonyms, ["Software Engineer"])


class TestSkillFilteringAndRotation(unittest.TestCase):
    def test_drop_generic_ai_skills(self):
        raw_skills = [
            "Artificial Intelligence",
            "Machine Learning",
            "Deep Learning",
            "NLP",
            "Python",
        ]
        filtered = filter_generic_skills(raw_skills, job_title="AI Developer")
        # Generic AI and Machine Learning should be dropped
        self.assertNotIn("Artificial Intelligence", filtered)
        self.assertNotIn("Machine Learning", filtered)
        self.assertIn("Deep Learning", filtered)
        self.assertIn("NLP", filtered)
        self.assertIn("Python", filtered)

    def test_skill_rotation(self):
        skills = ["Deep Learning", "NLP", "Python", "PyTorch", "Transformers"]
        r0 = rotate_skills(skills, variant_idx=0, count=2)
        r1 = rotate_skills(skills, variant_idx=1, count=2)
        # Verify that sets or order rotate
        self.assertEqual(len(r0), 2)
        self.assertEqual(len(r1), 2)
        self.assertNotEqual(r0, r1)


class TestExperienceAndLocation(unittest.TestCase):
    def test_parse_experience_range(self):
        exp = parse_experience_band("3-5 years")
        self.assertIsNotNone(exp)
        self.assertIn('"3 years"', exp)
        self.assertIn('"4 years"', exp)
        self.assertIn('"5 years"', exp)

    def test_parse_experience_plus(self):
        exp = parse_experience_band("5+ years")
        self.assertIsNotNone(exp)
        self.assertIn('"5 years"', exp)

    def test_expand_india_location(self):
        loc = expand_location("India", include_all_cities=True)
        self.assertIn('"India"', loc)
        self.assertIn('"Bengaluru"', loc)
        self.assertIn('"Hyderabad"', loc)


class TestWordCapAndTrimming(unittest.TestCase):
    def test_trimming_priority_under_30_words(self):
        long_query = build_and_trim_query(
            site_prefix="site:linkedin.com/in/",
            titles=["AI Engineer", "ML Engineer", "Machine Learning Engineer", "NLP Engineer", "Data Scientist"],
            signals='("open to work" OR "immediate joiner" OR "notice period" OR "actively looking" OR "looking for opportunities")',
            skills=["Deep Learning", "NLP", "Python", "Computer Vision"],
            location_str='("India" OR "Bengaluru" OR "Hyderabad" OR "Pune" OR "Mumbai" OR "Delhi" OR "Chennai")',
            exclusions='-hiring -recruiter -"we are hiring" -"job description" -jobs',
            experience_group='("3 years" OR "4 years" OR "5 years")',
            max_words=30,
        )
        words = count_words(long_query)
        self.assertLessEqual(words, 30)
        self.assertTrue(long_query.startswith("site:linkedin.com/in/"))

    def test_all_generated_queries_capped_at_30_words(self):
        queries = generate_sourcing_queries(
            job_title="AI Developer",
            core_skills=["Artificial Intelligence", "Machine Learning", "Deep Learning", "NLP", "Python"],
            seniority_or_experience="3-5 years",
            location="India",
            max_words=30,
        )
        self.assertEqual(len(queries), 5)
        for item in queries:
            words = count_words(item["query"])
            self.assertLessEqual(words, 30, f"Query '{item['channel']}' exceeded 30 words: {words} words: {item['query']}")
            self.assertIn("https://www.google.com/search?q=", item["google_url"])
            self.assertIn("&tbs=qdr:y", item["google_url"])


class TestURLValidator(unittest.TestCase):
    def test_valid_linkedin_profile(self):
        self.assertTrue(is_valid_candidate_url("https://www.linkedin.com/in/dharmik-patel-12345"))
        self.assertTrue(is_valid_candidate_url("https://linkedin.com/in/john-doe"))

    def test_invalid_linkedin_urls(self):
        # Reject jobs, company, pulse, posts
        self.assertFalse(is_valid_candidate_url("https://www.linkedin.com/jobs/view/123456"))
        self.assertFalse(is_valid_candidate_url("https://www.linkedin.com/company/google"))
        self.assertFalse(is_valid_candidate_url("https://www.linkedin.com/pulse/ai-trends-dharmik"))
        self.assertFalse(is_valid_candidate_url("https://www.linkedin.com/in/dharmik/recent-activity/posts/"))

    def test_valid_github_profile(self):
        self.assertTrue(is_valid_candidate_url("https://github.com/torvalds"))
        self.assertTrue(is_valid_candidate_url("https://www.github.com/octocat"))

    def test_invalid_github_urls(self):
        # Reject repos, issues, topics, pull requests
        self.assertFalse(is_valid_candidate_url("https://github.com/torvalds/linux"))
        self.assertFalse(is_valid_candidate_url("https://github.com/topics/machine-learning"))
        self.assertFalse(is_valid_candidate_url("https://github.com/features/actions"))
        self.assertFalse(is_valid_candidate_url("https://github.com/user/repo/pull/12"))

    def test_naukri_and_indeed_urls(self):
        self.assertTrue(is_valid_candidate_url("https://www.indeed.com/r/john-doe/123abc456"))
        self.assertFalse(is_valid_candidate_url("https://www.indeed.com/viewjob?jk=123456"))
        self.assertFalse(is_valid_candidate_url("https://www.naukri.com/ai-developer-jobs-in-bengaluru"))

    def test_public_resumes(self):
        self.assertTrue(is_valid_candidate_url("https://example.com/resumes/john_doe_cv.pdf"))
        self.assertTrue(is_valid_candidate_url("https://example.com/downloads/resume.docx"))
        self.assertFalse(is_valid_candidate_url("https://example.com/jobs/apply-now"))


if __name__ == "__main__":
    unittest.main()
