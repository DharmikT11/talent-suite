import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))

import unittest
from sourcer import (
    extract_email_from_text,
    fetch_github_public_email,
    find_candidate_email,
)

class TestEmailDiscovery(unittest.TestCase):
    def test_extract_email_from_text(self):
        text = "Hello contact me at candidate.work@gmail.com for opportunities"
        email = extract_email_from_text(text)
        self.assertEqual(email, "candidate.work@gmail.com")

    def test_extract_email_skips_excluded_domains(self):
        text = "Check out https://github.com or contact bot@sentry.io"
        email = extract_email_from_text(text)
        self.assertEqual(email, "")

    def test_fetch_github_public_email_empty_or_invalid(self):
        # Graceful handling of invalid or empty inputs
        self.assertEqual(fetch_github_public_email(""), "")
        self.assertEqual(fetch_github_public_email("https://github.com/topics"), "")

    def test_find_candidate_email_structure(self):
        result = find_candidate_email(
            name="John Doe",
            profile_url="https://in.linkedin.com/in/john-doe",
            headline="Firmware Engineer",
            location="Bengaluru, India"
        )
        self.assertIn("ok", result)
        self.assertIn("email", result)
        self.assertIn("source", result)

if __name__ == "__main__":
    unittest.main()
