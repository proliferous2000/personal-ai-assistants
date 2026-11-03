import unittest
from ha_quality import create_quality_plan, PrivacyReviewRequired, AGENTS

class WorkflowTests(unittest.TestCase):
    def example(self, **overrides):
        data = {"case_id":"Q-01", "title":"QI case", "scope":"clinical", "deidentified":True, "evidence":[]}
        data.update(overrides)
        return data

    def test_team_size(self):
        self.assertEqual(len(AGENTS), 16)

    def test_missing_evidence_does_not_score(self):
        plan = create_quality_plan(self.example())
        self.assertIsNone(plan["ha_score"])
        self.assertTrue(plan["missing_items"])
        self.assertEqual(plan["status"], "DRAFT_REQUIRES_HUMAN_REVIEW")

    def test_independent_auditor_always_included(self):
        for scope in ["clinical","risk","qi","sar","kpi","governance","digital","general","facilitation","internal_survey"]:
            with self.subTest(scope=scope):
                ids = [t["agent_id"] for t in create_quality_plan(self.example(scope=scope))["tasks"]]
                self.assertEqual(ids[0], "director")
                self.assertEqual(ids[-1], "auditor")

    def test_unidentified_data_required(self):
        with self.assertRaises(PrivacyReviewRequired):
            create_quality_plan(self.example(deidentified=False))

    def test_hn_warning(self):
        with self.assertRaises(PrivacyReviewRequired):
            create_quality_plan(self.example(title="case HN 123456789"))

    def test_thai_id_warning(self):
        with self.assertRaises(PrivacyReviewRequired):
            create_quality_plan(self.example(title="1234567890123"))

    def test_missing_required_fields(self):
        with self.assertRaises(ValueError):
            create_quality_plan(self.example(title=""))

    def test_unsupported_scope(self):
        with self.assertRaises(ValueError):
            create_quality_plan(self.example(scope="unauthorized"))

    def test_duplicate_evidence(self):
        item = {"evidence_id":"E1", "title":"A", "source":"internal", "locator":"page 1", "verified":True}
        with self.assertRaises(ValueError):
            create_quality_plan(self.example(evidence=[item,item]))

    def test_kpi_definition_required(self):
        p = create_quality_plan(self.example(scope="kpi"))
        self.assertTrue(any("KPI" in s for s in p["missing_items"]))

if __name__ == "__main__":
    unittest.main()
