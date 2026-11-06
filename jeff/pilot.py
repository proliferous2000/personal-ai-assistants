"""JEFF synthetic pilot. Run locally with python -m jeff.pilot DATABASE."""
import argparse
from contextlib import closing
from datetime import date, datetime, timezone
from hashlib import sha256
from html import escape
import json
import re
import secrets
import sqlite3
from urllib.parse import parse_qs, urlsplit
from uuid import uuid4
from wsgiref.simple_server import make_server

from jeff.router import REGISTRY_PATH, route

ROLES = {"staff-a": ("staff", "DEMO-A"), "staff-b": ("staff", "DEMO-B"),
         "reviewer": ("reviewer", "DEMO-QA"), "admin": ("admin", "DEMO-ADMIN")}
FIELDS = {
    "submit": ("request_key", "title", "summary", "category", "priority"),
    "tasks": (),
    "assign": ("id", "assignee"),
    "finish": ("id", "feedback"),
    "propose": ("title", "lesson", "scope", "source", "source_version", "source_date"),
    "review_queue": (),
    "review": ("id", "decision", "note"),
    "approve": ("id", "decision", "note"),
    "release": ("version", "card_ids"),
    "rollback": ("version", "note"),
    "pack": (),
    "dashboard": (),
    "issue": ("title", "summary"),
}


def initialize(path):
    with closing(sqlite3.connect(path, isolation_level="IMMEDIATE")) as db, db:
        db.execute("CREATE TABLE IF NOT EXISTS pilot (id INTEGER PRIMARY KEY, state TEXT NOT NULL)")
        db.execute("BEGIN IMMEDIATE")
        if db.execute("SELECT 1 FROM pilot WHERE id=1").fetchone():
            return {}
        tokens = {user: secrets.token_urlsafe(32) for user in ROLES}
        state = dict(users={user: sha256(token.encode()).hexdigest() for user, token in tokens.items()},
                     tasks={}, cards={}, releases={}, active=None, events=[], issues={})
        db.execute("INSERT INTO pilot VALUES (1, ?)", (json.dumps(state),))
        return tokens


def require(condition, message):
    if not condition:
        raise ValueError(message)


def execute(path, token, action, fields=None):
    fields = fields or {}
    with closing(sqlite3.connect(path, isolation_level="IMMEDIATE")) as db, db:
        db.execute("BEGIN IMMEDIATE")
        state = json.loads(db.execute("SELECT state FROM pilot WHERE id=1").fetchone()[0])
        digest = sha256(token.encode()).hexdigest()
        user = next((key for key, value in state["users"].items() if secrets.compare_digest(value, digest)), None)
        if user is None:
            raise PermissionError("Invalid pilot credential")
        role, unit = ROLES[user]
        if action == "dashboard" and role == "admin":
            counts = {}
            for task in state["tasks"].values():
                category = task["category"]
                counts[category] = counts.get(category, 0) + 1
            return dict(roster=ROLES, category_counts=counts, registry_version=registry()["version"],
                        **{key: value for key, value in state.items() if key != "users"})
        if action == "tasks":
            return [row for row in state["tasks"].values() if row["sender"] == user or role == "admin"]
        if action == "review_queue" and role == "reviewer":
            return [card for card in state["cards"].values() if card["status"] == "pending"]
        if action == "pack":
            active = state["active"]
            if active is None:
                return {"version": None, "registry_version": registry()["version"], "cards": []}
            release = state["releases"][active]
            return {"version": active, "registry_version": release["registry_version"], "cards": release["cards"]}
        if action not in FIELDS or action in {"dashboard", "tasks", "pack", "review_queue"}:
            raise PermissionError("Action unavailable")
        require(fields.get("synthetic") == "yes", "Confirm synthetic data only")
        data = {key: fields.get(key, "").strip() for key in FIELDS[action]}
        require(all(value and len(value) <= 2000 for value in data.values()), "Missing or oversized field")
        visible = " ".join(data.values())
        require(not re.search(r"\bHN\s*[:#-]?\s*\d{4,}|(?<!\d)\d{13}(?!\d)", visible, re.I),
                "Possible identifier. Synthetic data only.")
        now = datetime.now(timezone.utc).isoformat()
        result = change(state, user, role, unit, action, data, now)
        if result.get("replayed"):
            return result
        state["events"].append(dict(action=action, actor=user, time=now, ref=result.get("id", result.get("version"))))
        db.execute("UPDATE pilot SET state=? WHERE id=1", (json.dumps(state, ensure_ascii=False),))
        return result


def registry():
    return json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))


def change(state, user, role, unit, action, data, now):
    if action == "submit" and role == "staff":
        require(data["priority"] in {"normal", "high"}, "Use normal or high")
        require(data["category"] in {s["id"] for s in registry()["skills"]} | {"other"}, "Unknown category")
        tasks = state["tasks"]
        existing = next((row for row in tasks.values() if row["sender"] == user and
                         row["request_key"] == data["request_key"]), None)
        if existing:
            require(all(existing[key] == value for key, value in data.items()), "Request key already used")
            return dict(existing, replayed=True)
        identifier = "J-" + uuid4().hex
        plan = route({"text": data["title"] + " " + data["summary"], "deidentified": True})
        tasks[identifier] = dict(data, id=identifier, sender=user, unit=unit, status="received",
                                 created_at=now, suggested_route=plan["primary"])
        return tasks[identifier]
    if action in {"assign", "finish"} and role == "admin":
        task = state["tasks"].get(data["id"])
        require(task is not None, "Unknown task")
        if action == "assign":
            require(task["status"] == "received", "Task is not awaiting assignment")
            require(data["assignee"] == "admin", "Pilot assignment is to lead JEFF (admin)")
            task.update(status="assigned", assignee=data["assignee"], assigned_at=now)
        else:
            require(task["status"] == "assigned", "Task must be assigned first")
            task.update(status="done", feedback=data["feedback"], completed_at=now)
        return task
    if action == "issue":
        identifier = "I-" + uuid4().hex
        state["issues"][identifier] = dict(data, id=identifier, sender=user, unit=unit, created_at=now)
        return {"id": identifier}
    if action == "propose" and role in {"staff", "admin"}:
        date.fromisoformat(data["source_date"])
        identifier = "K-" + uuid4().hex
        state["cards"][identifier] = dict(data, id=identifier, proposer=user, proposed_at=now, status="pending")
        return {"id": identifier, "status": "pending"}
    if (action, role) in {("review", "reviewer"), ("approve", "admin")}:
        card = state["cards"].get(data["id"])
        expected = "pending" if action == "review" else "reviewed"
        require(card is not None and card["status"] == expected, "Card unavailable for this step")
        require(data["decision"] in {"yes", "no"}, "Use yes or no")
        require(user != card["proposer"] and user != card.get("reviewed_by"), "Separate human roles required")
        card["status"] = {"review": "reviewed", "approve": "approved"}[action] if data["decision"] == "yes" else "rejected"
        prefix = "reviewed" if action == "review" else "approved"
        card.update({prefix + "_by": user, prefix + "_at": now, prefix + "_note": data["note"]})
        return {"id": data["id"], "status": card["status"]}
    if action in {"release", "rollback"} and role == "admin":
        version = data["version"]
        releases = state["releases"]
        if action == "release":
            require(re.fullmatch(r"\d+\.\d+\.\d+", version), "Use version x.y.z")
            require(version not in releases, "Version already exists")
            ids = [value.strip() for value in data["card_ids"].split(",")]
            require(len(set(ids)) == len(ids), "Duplicate cards")
            cards = [state["cards"].get(identifier) for identifier in ids]
            require(all(card and card["status"] == "approved" for card in cards), "All cards must be approved")
            public_fields = ("id", "title", "lesson", "scope", "source", "source_version",
                             "source_date", "reviewed_by", "reviewed_at", "approved_by", "approved_at")
            snapshot = [{key: card[key] for key in public_fields} for card in cards]
            releases[version] = dict(cards=snapshot, created_at=now, created_by=user,
                                     registry_version=registry()["version"])
        else:
            require(version in releases and version != state["active"], "Select a different existing release")
            state["events"].append(dict(action="rollback_reason", actor=user, time=now,
                                        ref=state["active"], target=version, note=data["note"]))
        state["active"] = version
        return {"version": version}
    raise PermissionError("Action unavailable for this role")


def form_page():
    forms = []
    for action, fields in FIELDS.items():
        inputs = "".join(f'<label>{key} <input name="{key}" required maxlength="2000"></label><br>'
                         for key in fields)
        confirmation = ('<label><input type="checkbox" name="synthetic" value="yes" required> ข้อมูลสมมติเท่านั้น</label>'
                        if action not in {"tasks", "pack", "dashboard", "review_queue"} else "")
        forms.append(f'<details><summary>{action}</summary><form method="post" action="/{action}">'
                     f'<label>รหัสทดลอง <input type="password" name="token" required></label><br>'
                     f'{inputs}{confirmation}<button>ดำเนินการ</button></form></details>')
    return '<h1>JEFF Pilot · ข้อมูลสมมติ</h1>' + "".join(forms)


def display(result, action):
    def pre(value):
        return "<pre>" + escape(json.dumps(value, ensure_ascii=False, indent=2)) + "</pre>"

    if action != "dashboard":
        return pre(result)
    sections = {
        "roster": "ผู้ใช้และสิทธิ์",
        "tasks": "ทะเบียนงานและผลตอบกลับ",
        "category_counts": "จำนวนงานตามประเภทที่ผู้ส่งเลือก",
        "cards": "บทเรียนและสถานะตรวจอนุมัติ",
        "releases": "เวอร์ชันความรู้",
        "events": "ประวัติการดำเนินการ",
        "issues": "ปัญหาและข้อเสนอ",
    }
    header = f'<h1>JEFF Administration · Pilot</h1><p>Registry {escape(result["registry_version"])}'
    header += f' · Knowledge release {escape(result["active"] or "ยังไม่เผยแพร่")}</p>'
    return header + "".join(f"<h2>{title}</h2>{pre(result[key])}" for key, title in sections.items())


def application(path, origin):
    def app(env, start_response):
        status = "200 OK"
        try:
            if env["REQUEST_METHOD"] == "GET" and env["PATH_INFO"] == "/":
                body = form_page()
            elif env["REQUEST_METHOD"] == "POST":
                if env.get("HTTP_HOST") != urlsplit(origin).netloc or env.get("HTTP_ORIGIN") != origin:
                    raise PermissionError("Local origin required")
                length = int(env.get("CONTENT_LENGTH") or "0")
                require(0 < length <= 48000, "Invalid form length")
                form = parse_qs(env["wsgi.input"].read(length).decode(), max_num_fields=12)
                values = {key: value[0] for key, value in form.items()}
                action = env["PATH_INFO"].lstrip("/")
                result = execute(path, values.pop("token", ""), action, values)
                body = display(result, action)
            else:
                status, body = "404 Not Found", "Not found"
        except PermissionError as exc:
            status, body = "403 Forbidden", escape(str(exc))
        except ValueError as exc:
            status, body = "400 Bad Request", escape(str(exc))
        page = f'<!doctype html><html lang="th"><meta charset="utf-8"><title>JEFF Pilot</title>{body}<p><a href="/">กลับหน้าหลัก</a></p>'
        start_response(status, [("Content-Type", "text/html; charset=utf-8"), ("Cache-Control", "no-store"),
                                ("Content-Security-Policy", "default-src 'none'; form-action 'self'; frame-ancestors 'none'")])
        return [page.encode()]
    return app


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("database", help="Use a private directory outside the repository")
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()
    import os
    os.umask(0o077)
    tokens = initialize(args.database)
    if tokens:
        print("Synthetic pilot credentials (shown once):", json.dumps(tokens), flush=True)
    origin = f"http://127.0.0.1:{args.port}"
    print(origin, flush=True)
    with make_server("127.0.0.1", args.port, application(args.database, origin)) as server:
        server.serve_forever()
