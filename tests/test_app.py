import io
import sqlite3

import pytest

from app import COOKIE, MAX_FILE_BYTES, create_app

PASSWORD = "test-only-password-2026"


@pytest.fixture
def app(tmp_path):
    return create_app({"TESTING": True, "DATA_DIR": tmp_path / "data", "UPLOAD_DIR": tmp_path / "uploads", "SEED_PASSWORD": PASSWORD})


def login(client, name="teacher_a"):
    return client.post("/api/login", json={"username": name, "password": PASSWORD})


def upload(client, name="lesson.md", body=b"# Lesson\n\nReal content."):
    return client.post("/api/materials", data={"file": (io.BytesIO(body), name), "class_id": "2"})


def state(app):
    with sqlite3.connect(app.config["DATA_DIR"] / "campusclaw.sqlite3") as conn:
        counts = tuple(conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0] for table in ("materials", "knowledge_entries"))
    return counts, sorted(p.name for p in app.config["UPLOAD_DIR"].iterdir())


def test_seeds_and_restart(app):
    before = state(app)
    restarted = create_app(app.config)
    assert state(restarted) == before
    with sqlite3.connect(app.config["DATA_DIR"] / "campusclaw.sqlite3") as conn:
        users = conn.execute("SELECT username,password_hash FROM users").fetchall()
        assert len(users) == 3 and all(value.startswith("scrypt:") and value != PASSWORD for _, value in users)
    assert restarted.test_client().post("/api/login", json={"username": "missing", "password": "wrong"}).status_code == 401


def test_login_identity_logout_and_no_session(app):
    client = app.test_client()
    assert client.get("/").status_code == 302
    assert client.get("/health").status_code == 200
    for url in ("/api/me", "/api/materials", "/api/materials/1", "/api/materials/1/file"):
        assert client.get(url).status_code == 401
    response = login(client)
    assert response.status_code == 200
    assert "HttpOnly" in response.headers["Set-Cookie"] and "SameSite=Lax" in response.headers["Set-Cookie"]
    token = client.get_cookie(COOKIE).value
    assert client.get("/api/me").json["user"]["class_id"] == 1
    assert client.post("/api/logout").status_code == 200
    client.set_cookie(COOKIE, token)
    assert client.get("/api/me").status_code == 401


def test_wrong_password_and_limit(app):
    client = app.test_client()
    for i in range(10):
        response = client.post("/api/login", json={"username": "teacher_a" if i % 2 else "missing", "password": "wrong"})
        assert response.status_code == 401 and response.json == {"error": "账号或密码错误"}
    assert login(client).status_code == 429


def test_upload_read_download_and_isolation(app):
    teacher, student, other = (app.test_client() for _ in range(3))
    login(teacher)
    login(student, "student_a1")
    login(other, "student_b1")
    response = upload(teacher)
    assert response.status_code == 201
    mid = response.json["material_id"]
    assert mid in [r["id"] for r in student.get("/api/materials?class_id=2").json["materials"]]
    assert student.get(f"/api/materials/{mid}/file").data == b"# Lesson\n\nReal content."
    assert "Real content" in student.get(f"/api/materials/{mid}").json["material"]["body_text"]
    for suffix in ("", "/file"):
        denied = other.get(f"/api/materials/{mid}{suffix}")
        absent = other.get(f"/api/materials/999999{suffix}")
        assert denied.status_code == 404 and denied.json == absent.json
    assert not other.get("/api/materials?q=Real%20content").json["materials"]
    assert teacher.get("/uploads/seed-1.md").status_code == 404
    before = state(app)
    assert upload(student).status_code == 403
    assert state(app) == before


@pytest.mark.parametrize("name,body,status", [("x.pdf", b"file", 415), ("x.md.exe", b"file", 415), ("x.md", b" ", 400), ("x.txt", b"\xff", 400), ("x.txt", b"a\x00b", 400), ("x.txt", b"x" * (MAX_FILE_BYTES + 1), 413)])
def test_rejected_upload_leaves_no_state(app, name, body, status):
    client = app.test_client()
    login(client)
    before = state(app)
    assert upload(client, name, body).status_code == status
    assert state(app) == before


def test_transaction_failure_cleans_file(app):
    client = app.test_client()
    login(client)
    before = state(app)
    with sqlite3.connect(app.config["DATA_DIR"] / "campusclaw.sqlite3") as conn:
        conn.execute("CREATE TRIGGER fail_knowledge BEFORE INSERT ON knowledge_entries BEGIN SELECT RAISE(ABORT,'test failure'); END")
    assert upload(client).status_code == 500
    assert state(app) == before


def test_filename_and_markdown_safety(app):
    client = app.test_client()
    login(client)
    mid = upload(client, "../../unsafe.md", b"<script>window.pwned=true</script>\n\n[link](javascript:alert(1))").json["material_id"]
    detail = client.get(f"/api/materials/{mid}").json
    assert detail["material"]["original_name"] == "unsafe.md"
    assert "<script>" not in detail["rendered_html"]
    assert 'href="javascript:' not in detail["rendered_html"]


def test_origin_and_missing_config(app, tmp_path):
    client = app.test_client()
    assert client.post("/api/login", json={"username":"teacher_a","password":PASSWORD}, headers={"Origin":"https://other.example"}).status_code == 403
    with pytest.raises(RuntimeError, match="SEED_PASSWORD"):
        create_app({"SEED_PASSWORD": "", "DATA_DIR": tmp_path})
