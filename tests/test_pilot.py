from concurrent.futures import ThreadPoolExecutor
from io import BytesIO
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from urllib.parse import urlencode
from wsgiref.util import setup_testing_defaults
from wsgiref.validate import validator

from jeff.pilot import application, execute, initialize
from jeff.router import route


class PilotTests(unittest.TestCase):
    def setUp(self):
        temporary = TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.db = Path(temporary.name) / "pilot.sqlite"
        self.tokens = initialize(self.db)

    def act(self, user, action, **fields):
        return execute(self.db, self.tokens[user], action, dict(fields, synthetic="yes"))

    def submit(self, **updates):
        fields = dict(request_key="demo-1", title="ออกแบบวิจัย R&D",
                      summary="แบบจำลอง", category="rd", priority="normal")
        return self.act("staff-a", "submit", **(fields | updates))

    def card(self, title):
        return self.act("staff-a", "propose", title=title, lesson="บทเรียนสมมติ",
                        scope="simulation", source="fixture:demo", source_version="1",
                        source_date="2026-11-06")["id"]

    def verify(self, identifier):
        self.act("reviewer", "review", id=identifier, decision="yes", note="Checked synthetic source")
        self.act("admin", "approve", id=identifier, decision="yes", note="Approved for synthetic pilot")

    def test_task_lifecycle_and_isolation(self):
        with ThreadPoolExecutor(max_workers=2) as pool:
            first, second = list(pool.map(lambda _: self.submit(), range(2)))
        identifier = first["id"]
        self.assertEqual(identifier, second["id"])
        self.assertEqual(first["suggested_route"], "rd")
        with self.assertRaises(ValueError):
            self.submit(title="Different payload")
        with self.assertRaises(PermissionError):
            self.act("staff-b", "finish", id=identifier, feedback="Denied")
        self.act("admin", "assign", id=identifier, assignee="admin")
        self.act("admin", "finish", id=identifier, feedback="คำตอบตัวอย่าง")
        self.assertEqual(initialize(self.db), {})
        self.assertEqual(self.act("staff-a", "tasks")[0]["feedback"], "คำตอบตัวอย่าง")
        self.assertEqual(self.act("staff-b", "tasks"), [])
        with self.assertRaises(PermissionError):
            self.act("staff-b", "dashboard")
        self.assertEqual(self.act("admin", "dashboard")["category_counts"], {"rd": 1})

    def test_approval_version_and_rollback(self):
        first = self.card("A")
        with self.assertRaises(ValueError):
            self.act("admin", "release", version="1.0.0", card_ids=first)
        with self.assertRaises(PermissionError):
            self.act("staff-a", "review", id=first, decision="yes", note="Denied")
        self.assertEqual(self.act("staff-b", "pack")["cards"], [])
        self.verify(first)
        self.act("admin", "release", version="1.0.0", card_ids=first)
        second = self.card("B")
        self.verify(second)
        self.act("admin", "release", version="1.1.0", card_ids=f"{first},{second}")
        with self.assertRaises(ValueError):
            self.act("admin", "release", version="1.0.0", card_ids=second)
        self.act("admin", "rollback", version="1.0.0", note="Restore baseline")
        pack = self.act("staff-b", "pack")
        self.assertEqual([card["id"] for card in pack["cards"]], [first])
        self.assertIn("1.1.0", self.act("admin", "dashboard")["releases"])

    def test_rejection_and_self_approval(self):
        identifier = self.card("Rejected")
        self.act("reviewer", "review", id=identifier, decision="no", note="Source failed verification")
        with self.assertRaises(ValueError):
            self.act("admin", "approve", id=identifier, decision="yes", note="Denied")
        card = self.act("admin", "propose", title="Admin draft", lesson="Synthetic",
                        scope="simulation", source="fixture:demo", source_version="1",
                        source_date="2026-11-06")
        self.act("reviewer", "review", id=card["id"], decision="yes", note="Checked")
        with self.assertRaises(ValueError):
            self.act("admin", "approve", id=card["id"], decision="yes", note="Self-approval denied")

    def test_missing_capability_and_unapproved_data(self):
        plan = route(dict(text="วิเคราะห์ RCA และ 5-Tier", deidentified=True))
        self.assertEqual(plan["primary"], "rca")
        self.assertEqual(route(dict(text="ขอทบทวน 5-Tier", deidentified=True))["primary"], "rca")
        self.assertFalse(plan["chatgpt_connected"])
        self.assertEqual(plan["executed_skills"], [])
        with self.assertRaises(PermissionError):
            execute(self.db, "invalid", "tasks")
        with self.assertRaises(ValueError):
            self.submit(summary="HN 123456")
        with self.assertRaises(ValueError):
            execute(self.db, self.tokens["staff-a"], "submit", {})
        self.assertEqual(self.act("staff-a", "tasks"), [])

    def test_http_forms_enforce_origin_roles_and_escape(self):
        origin = "http://127.0.0.1:8765"
        app = validator(application(self.db, origin))

        def request(path, fields=None, posted_from=origin):
            env = {}
            setup_testing_defaults(env)
            env.update(PATH_INFO=path, QUERY_STRING="", HTTP_HOST="127.0.0.1:8765")
            if fields is not None:
                data = urlencode(fields).encode()
                env.update(REQUEST_METHOD="POST", HTTP_ORIGIN=posted_from,
                           CONTENT_LENGTH=str(len(data)), **{"wsgi.input": BytesIO(data)})
            status = []
            result = app(env, lambda code, headers, exc_info=None: status.append(code))
            try:
                return status[0], b"".join(result).decode()
            finally:
                result.close()

        self.assertIn('action="/submit"', request("/")[1])
        self.assertEqual(request("/dashboard", {"token": self.tokens["staff-a"]})[0], "403 Forbidden")
        self.assertEqual(request("/tasks", {"token": self.tokens["staff-a"]}, "https://example.invalid")[0],
                         "403 Forbidden")
        result = request("/issue", dict(token=self.tokens["staff-a"], synthetic="yes",
                                       title="<script>", summary="synthetic issue"))
        self.assertEqual(result[0], "200 OK")
        dashboard = request("/dashboard", {"token": self.tokens["admin"]})[1]
        self.assertIn("&lt;script&gt;", dashboard)
        self.assertNotIn(self.tokens["staff-a"], dashboard)
