import json
import unittest
from pathlib import Path
from jeff.router import route, REGISTRY_PATH
from ha_quality import create_quality_plan, create_survey_plan

CASES = [
 ('R&D', 'ช่วยออกแบบงานวิจัย R&D สำหรับพัฒนาโปรแกรม', 'rd', {'methodology'}),
 ('EC', 'ช่วยวิจารณ์โครงการวิจัย R&D ในฐานะ EC', 'ethics', {'rd','protocol','consent','risk_benefit'}),
 ('RCA', 'วิเคราะห์ RCA อุบัติการณ์ทางคลินิก', 'rca', {'risk','safety','ha'}),
 ('QI', 'วิเคราะห์ QI Plan ตามมาตรฐาน HA', 'qi', {'ha','kpi'}),
 ('Workload', 'วิเคราะห์ Workload และ Productivity พยาบาล', 'workload', {'kpi'}),
]
class IntegrationTests(unittest.TestCase):
    def test_five_scenarios_and_followup(self):
        for name, text, primary, support in CASES:
            with self.subTest(name=name):
                r=route(dict(text=text,deidentified=True))
                self.assertEqual(r['primary'],primary)
                self.assertTrue(support <= set(r['support']))
                self.assertIn('citation',r['support'])
                self.assertIn('reviewer',r['support'])
                self.assertTrue(r['review_required'])
                self.assertFalse(r['evidence_verified'])
                self.assertFalse(r['chatgpt_connected'])
                self.assertEqual(r['executed_skills'],[])
                self.assertTrue(r['capability_gaps'])
                follow=route(dict(text='ขอปรับกลุ่มเป้าหมายและทบทวนข้อจำกัด',deidentified=True,
                    previous={'primary':r['primary'],'support':r['support']}))
                self.assertEqual(follow['primary'],primary)
                self.assertTrue(follow['context_inherited'])
    def test_new_intent_replaces_prior(self):
        r=route(dict(text='เปลี่ยนเป็น Action Research',deidentified=True,previous={'primary':'rct'}))
        self.assertEqual(r['primary'],'action')
        self.assertNotIn('rct',r['support'])
    def test_ambiguity_and_unknown(self):
        self.assertTrue(route(dict(text='R&D และ QI',deidentified=True))['needs_context_review'])
        self.assertIsNone(route(dict(text='ช่วยพัฒนางานนี้',deidentified=True))['primary'])
        self.assertIsNone(route(dict(text='architecture',deidentified=True))['primary'])
    def test_input_and_privacy(self):
        for data in [{},dict(text='QI',deidentified=False),dict(text='HN 123456',deidentified=True),
                     dict(text='QI',deidentified=True,previous={'primary':'fake'}),
                     dict(text='QI',deidentified=True,previous={'support':'qi'})]:
            with self.subTest(data=data), self.assertRaises(ValueError): route(data)
    def test_registry_sources_and_dependencies(self):
        reg=json.loads(REGISTRY_PATH.read_text())
        ids={x['id'] for x in reg['skills']}
        self.assertEqual(len(ids),29)
        for skill in reg['skills']:
            self.assertTrue(set(skill['support'])<=ids)
            self.assertFalse(skill['project_installed'])
            for src in skill['sources']:
                if not src.startswith('skill://'): self.assertTrue(Path(src).is_file(),src)
    def test_reuse_ha_quality_with_missing_evidence(self):
        for scope in ['risk','qi','kpi']:
            p=create_quality_plan(dict(case_id='SYNTHETIC',title='synthetic',scope=scope,deidentified=True,evidence=[]))
            self.assertTrue(p['missing_items'])
            self.assertIsNone(p['ha_score'])
            self.assertEqual(p['tasks'][-1]['agent_id'],'auditor')
    def test_reuse_ha_survey_separation(self):
        with self.assertRaisesRegex(ValueError,'independence conflict'):
            create_survey_plan(dict(survey_id='SYNTHETIC',facility_alias='synthetic',mode='internal_survey',
                deidentified=True,target_parts=['I','II','III','IV'],surveyors=['coach-a'],previous_coach_ids=['coach-a']))

if __name__=='__main__': unittest.main()
