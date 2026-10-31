import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))

import unittest
from sourcer import is_experience_compatible, is_role_compatible

class TestExperienceAndRoleFilter(unittest.TestCase):
    def test_junior_rejects_experienced_candidate(self):
        # 5 years experience must be rejected for 0 to 1 year opening
        self.assertFalse(is_experience_compatible(5.0, "5 years experience in .NET", "0 to 1 year"))
        self.assertFalse(is_experience_compatible(3.0, "3 yrs experience", "0 to 1 year"))
        self.assertTrue(is_experience_compatible(1.0, "1 year experience", "0 to 1 year"))
        self.assertTrue(is_experience_compatible(0.5, "6 months experience", "0 to 1 year"))

    def test_mid_level_experience(self):
        self.assertFalse(is_experience_compatible(5.0, "5 years experience", "1 to 3 years"))
        self.assertTrue(is_experience_compatible(2.5, "2.5 years experience", "1 to 3 years"))
        self.assertFalse(is_experience_compatible(10.0, "10 years experience", "3 to 5 years"))
        self.assertTrue(is_experience_compatible(4.0, "4 years experience", "3 to 5 years"))

    def test_ai_role_rejects_net_angular_web_dev(self):
        net_text = "Results-driven Software Engineer with 5 years of experience building scalable web applications using .NET Core, C#, Angular, Azure, AWS."
        self.assertFalse(is_role_compatible(net_text, "AI developer"))

    def test_ai_role_accepts_real_ai_candidate(self):
        ai_text = "AI/ML Engineer with experience in PyTorch, Large Language Models, NLP, and Deep Learning pipelines."
        self.assertTrue(is_role_compatible(ai_text, "AI developer"))

if __name__ == "__main__":
    unittest.main()
