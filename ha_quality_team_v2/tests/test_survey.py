import unittest
from ha_quality import create_survey_plan, PrivacyReviewRequired

class SurveyTests(unittest.TestCase):
    def example(self, **overrides):
        d={"survey_id":"IS-001", "facility_alias":"โรงพยาบาลตัวอย่าง", "mode":"internal_survey",
           "deidentified":True,"target_parts":["I","II","III","IV"],"verified_standard_clause":False,
           "surveyors":["team-b"],"previous_coach_ids":["team-a"],"evidence":[]}
        d.update(overrides)
        return d

    def test_no_score_no_accreditation(self):
        p=create_survey_plan(self.example())
        self.assertIsNone(p["ha_score"])
        self.assertTrue(p["not_official_hai_survey"])
        self.assertIsNone(p["official_accreditation_decision"])
        self.assertEqual(len(p["sample_questions"]), 8)
    def test_coaching_does_not_assign_internal_survey_lead(self):
        p=create_survey_plan(self.example(mode="facilitation"))
        roles={x["id"] for x in p["roles"]}
        self.assertIn("facilitator",roles)
        self.assertNotIn("surveyor",roles)
    def test_internal_no_self_review(self):
        with self.assertRaisesRegex(ValueError,"independence conflict"):
            create_survey_plan(self.example(previous_coach_ids=["team-b"]))
    def test_missing_evidence_is_explicit(self):
        p=create_survey_plan(self.example())
        self.assertGreaterEqual(len(p["evidence_gaps"]),4)
    def test_unverified_evidence_is_not_triangulated(self):
        ev=[{"evidence_id":"E1","title":"draft","locator":"p1","type":"document","verified":False}]
        p=create_survey_plan(self.example(evidence=ev))
        self.assertEqual(p["evidence_verified_by_type"],{})
        self.assertIn("E1",p["evidence_pending_ids"])
    def test_verified_multiple_sources(self):
        ev=[{"evidence_id":f"E{i}","title":"synthetic","locator":"local","type":kind,"verified":True} for i,kind in enumerate(["document","interview","observation","indicator"])]
        p=create_survey_plan(self.example(evidence=ev,verified_standard_clause=True))
        self.assertEqual(len(p["evidence_gaps"]),0)
    def test_privacy(self):
        with self.assertRaises(PrivacyReviewRequired):
            create_survey_plan(self.example(facility_alias="HN 12345678"))
    def test_duplicate_parts(self):
        with self.assertRaises(ValueError):
            create_survey_plan(self.example(target_parts=["II","II"]))
    def test_duplicate_evidence(self):
        x={"evidence_id":"E1","title":"draft","locator":"p1","type":"document"}
        with self.assertRaises(ValueError):
            create_survey_plan(self.example(evidence=[x,x]))
    def test_safety_escalation(self):
        p=create_survey_plan(self.example(unresolved_safety_signals=["possible unsafe medicine process"]))
        self.assertTrue(p["risk_escalation"])
        self.assertEqual(p["safety_signals_count"],1)
    def test_mode_validation(self):
        with self.assertRaises(ValueError):
            create_survey_plan(self.example(mode="certification"))

if __name__ == "__main__":
    unittest.main()
