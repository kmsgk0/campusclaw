import hashlib
import os
import secrets
import sqlite3
import time
from functools import wraps
from pathlib import Path
from uuid import uuid4

from dotenv import load_dotenv
from flask import Flask, g, jsonify, redirect, render_template, request, send_file
from markdown_it import MarkdownIt
from werkzeug.exceptions import HTTPException
from werkzeug.security import check_password_hash, generate_password_hash

MAX_FILE_BYTES = 2 * 1024 * 1024
COOKIE = "campus_session"
SESSION_SECONDS = 8 * 60 * 60
MARKDOWN = MarkdownIt("commonmark", {"html": False}).enable("table")


def render_markdown(text):
    tokens = MARKDOWN.parse(text)
    for token in tokens:
        if token.type in ("heading_open", "heading_close"):
            token.tag = "h" + str(min(int(token.tag[1]) + 2, 6))
    return MARKDOWN.renderer.render(tokens, MARKDOWN.options, {})


def create_app(config=None):
    load_dotenv()
    app = Flask(__name__)
    app.config.update(
        DATA_DIR=os.getenv("DATA_DIR", "data"),
        UPLOAD_DIR=os.getenv("UPLOAD_DIR", "uploads"),
        SEED_PASSWORD=os.getenv("SEED_PASSWORD"),
        COOKIE_SECURE=os.getenv("COOKIE_SECURE", "false").lower() == "true",
        MAX_CONTENT_LENGTH=MAX_FILE_BYTES + 64 * 1024,
    )
    if config:
        app.config.update(config)
    if not app.config["SEED_PASSWORD"] or len(app.config["SEED_PASSWORD"]) < 12:
        raise RuntimeError("SEED_PASSWORD must be set to at least 12 characters")
    data_dir = Path(app.config["DATA_DIR"])
    upload_dir = Path(app.config["UPLOAD_DIR"])
    data_dir.mkdir(parents=True, exist_ok=True)
    upload_dir.mkdir(parents=True, exist_ok=True)
    database = data_dir / "campusclaw.sqlite3"
    failures = {}
    dummy_hash = generate_password_hash(secrets.token_hex(24), method="scrypt")

    def connect():
        conn = sqlite3.connect(database)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        return conn

    def db():
        if "db" not in g:
            g.db = connect()
        return g.db

    @app.teardown_appcontext
    def close_db(_error):
        if "db" in g:
            g.db.close()

    with connect() as conn:
        conn.executescript(Path(__file__).with_name("schema.sql").read_text())
        if not conn.execute("SELECT 1 FROM users LIMIT 1").fetchone():
            conn.executemany("INSERT INTO classes(id, name) VALUES (?, ?)", [(1, "A 班"), (2, "B 班")])
            password_hash = generate_password_hash(app.config["SEED_PASSWORD"], method="scrypt")
            conn.executemany(
                "INSERT INTO users(username, display_name, password_hash, role, class_id) VALUES (?, ?, ?, ?, ?)",
                [("teacher_a", "A 班教师", password_hash, "teacher", 1),
                 ("student_a1", "A 班学生", password_hash, "student", 1),
                 ("student_b1", "B 班学生", password_hash, "student", 2)],
            )
            for class_id in (1, 2):
                letter = "A" if class_id == 1 else "B"
                body = f"# {letter} 班学习材料\n\n这是 {letter} 班的预置教学材料。\n\n## 本周学习内容\n\n- 理解身份认证与角色权限\n- 认识班级数据隔离\n- 完成教学材料的上传与入库\n\n> 本材料仅对本班成员开放。\n"
                filename = f"seed-{class_id}.md"
                (upload_dir / filename).write_text(body, encoding="utf-8")
                cur = conn.execute(
                    "INSERT INTO materials(class_id,title,original_name,storage_name,size_bytes,uploaded_by) VALUES(?,?,?,?,?,?)",
                    (class_id, f"{letter} 班学习材料", f"{letter}班学习材料.md", filename, len(body.encode()), 1 if class_id == 1 else 3),
                )
                conn.execute("INSERT INTO knowledge_entries(material_id,class_id,body_text) VALUES(?,?,?)", (cur.lastrowid, class_id, body))

    @app.before_request
    def identify():
        g.user = None
        token = request.cookies.get(COOKIE)
        if token:
            g.user = db().execute(
                "SELECT u.id,u.username,u.display_name,u.role,u.class_id,c.name class_name "
                "FROM sessions s JOIN users u ON u.id=s.user_id JOIN classes c ON c.id=u.class_id "
                "WHERE s.token_hash=? AND s.expires_at>?",
                (hashlib.sha256(token.encode()).hexdigest(), time.time()),
            ).fetchone()
        if request.method in ("POST", "PUT", "DELETE", "PATCH"):
            origin = request.headers.get("Origin")
            if origin and origin != request.host_url.rstrip("/"):
                return jsonify(error="请求来源不允许"), 403

    @app.after_request
    def headers(response):
        response.headers["Cache-Control"] = "no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "same-origin"
        response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
        return response

    @app.errorhandler(HTTPException)
    def http_error(error):
        messages = {400: "请求内容不正确", 404: "材料不存在", 405: "请求方法不允许", 413: "文件不能超过 2 MiB"}
        return jsonify(error=messages.get(error.code, error.name)), error.code

    def login_required(fn):
        @wraps(fn)
        def wrapped(*args, **kwargs):
            if g.user is None:
                return jsonify(error="请先登录"), 401
            return fn(*args, **kwargs)
        return wrapped

    @app.get("/health")
    def health():
        return jsonify(status="ok")

    @app.get("/login")
    def login_page():
        return redirect("/") if g.user else render_template("index.html")

    @app.get("/")
    def workspace():
        return render_template("index.html") if g.user else redirect("/login")

    @app.post("/api/login")
    def login():
        address = request.remote_addr
        now = time.time()
        recent = [stamp for stamp in failures.get(address, []) if stamp > now - 300]
        failures[address] = recent
        if len(recent) >= 10:
            return jsonify(error="登录失败次数过多，请 5 分钟后再试"), 429
        payload = request.get_json(silent=True)
        if not isinstance(payload, dict) or not isinstance(payload.get("username"), str) or not isinstance(payload.get("password"), str):
            return jsonify(error="请提供账号和密码"), 400
        user = db().execute("SELECT * FROM users WHERE username=?", (payload["username"],)).fetchone()
        # The dummy hash keeps unknown-user and incorrect-password work comparable.
        valid = check_password_hash(user["password_hash"] if user else dummy_hash, payload["password"])
        if not user or not valid:
            failures[address].append(now)
            return jsonify(error="账号或密码错误"), 401
        failures.pop(address, None)
        token = secrets.token_urlsafe(32)
        old_token = request.cookies.get(COOKIE)
        with db() as conn:
            if old_token:
                conn.execute("DELETE FROM sessions WHERE token_hash=?", (hashlib.sha256(old_token.encode()).hexdigest(),))
            conn.execute("DELETE FROM sessions WHERE expires_at<=?", (now,))
            conn.execute("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)", (hashlib.sha256(token.encode()).hexdigest(), user["id"], now + SESSION_SECONDS))
        response = jsonify(user={key: user[key] for key in ("id", "username", "display_name", "role", "class_id")})
        response.set_cookie(COOKIE, token, max_age=SESSION_SECONDS, httponly=True, samesite="Lax", secure=app.config["COOKIE_SECURE"])
        return response

    @app.get("/api/me")
    @login_required
    def me():
        return jsonify(user=dict(g.user))

    @app.post("/api/logout")
    @login_required
    def logout():
        with db() as conn:
            conn.execute("DELETE FROM sessions WHERE token_hash=?", (hashlib.sha256(request.cookies[COOKIE].encode()).hexdigest(),))
        response = jsonify(message="已退出登录")
        response.delete_cookie(COOKIE, httponly=True, samesite="Lax", secure=app.config["COOKIE_SECURE"])
        return response

    @app.get("/api/materials")
    @login_required
    def materials():
        query = request.args.get("q", "").strip()
        rows = db().execute(
            "SELECT m.id,m.title,m.original_name,m.size_bytes,m.created_at,u.display_name author "
            "FROM materials m JOIN users u ON m.uploaded_by=u.id JOIN knowledge_entries k ON k.material_id=m.id "
            "WHERE m.class_id=? AND (?='' OR instr(lower(m.title),lower(?))>0 OR instr(lower(k.body_text),lower(?))>0) "
            "ORDER BY m.id DESC", (g.user["class_id"], query, query, query),
        ).fetchall()
        return jsonify(materials=[dict(row) for row in rows])

    def find_material(material_id):
        return db().execute(
            "SELECT m.*,k.body_text,u.display_name author FROM materials m "
            "JOIN knowledge_entries k ON k.material_id=m.id JOIN users u ON u.id=m.uploaded_by "
            "WHERE m.id=? AND m.class_id=?", (material_id, g.user["class_id"]),
        ).fetchone()

    @app.get("/api/materials/<int:material_id>")
    @login_required
    def detail(material_id):
        row = find_material(material_id)
        if row is None:
            return jsonify(error="材料不存在"), 404
        return jsonify(material={key: row[key] for key in ("id", "title", "original_name", "created_at", "author", "body_text")},
                       rendered_html=render_markdown(row["body_text"]) if row["original_name"].lower().endswith(".md") else None)

    @app.get("/api/materials/<int:material_id>/file")
    @login_required
    def download(material_id):
        row = find_material(material_id)
        if row is None:
            return jsonify(error="材料不存在"), 404
        return send_file((upload_dir / row["storage_name"]).resolve(), as_attachment=True, download_name=row["original_name"], mimetype="text/plain; charset=utf-8")

    @app.post("/api/materials")
    @login_required
    def upload():
        if g.user["role"] != "teacher":
            return jsonify(error="仅教师可以上传材料"), 403
        file = request.files.get("file")
        if not file or not file.filename:
            return jsonify(error="请选择文件"), 400
        original_name = file.filename.replace("\\", "/").rsplit("/", 1)[-1]
        extension = Path(original_name).suffix.lower()
        if extension not in (".txt", ".md"):
            return jsonify(error="仅支持 .txt 和 .md 文件"), 415
        content = file.read(MAX_FILE_BYTES + 1)
        if len(content) > MAX_FILE_BYTES:
            return jsonify(error="文件不能超过 2 MiB"), 413
        try:
            body = content.decode("utf-8-sig")
        except UnicodeDecodeError:
            return jsonify(error="文件必须使用 UTF-8 编码"), 400
        if not body.strip() or "\x00" in body:
            return jsonify(error="文件正文为空或包含非法字符"), 400
        storage_name = uuid4().hex + extension
        destination = upload_dir / storage_name
        title = Path(original_name).stem
        try:
            destination.write_bytes(content)
            with db() as conn:
                cur = conn.execute("INSERT INTO materials(class_id,title,original_name,storage_name,size_bytes,uploaded_by) VALUES(?,?,?,?,?,?)",
                                   (g.user["class_id"], title, original_name, storage_name, len(content), g.user["id"]))
                material_id = cur.lastrowid
                conn.execute("INSERT INTO knowledge_entries(material_id,class_id,body_text) VALUES(?,?,?)", (material_id, g.user["class_id"], body))
        except (OSError, sqlite3.Error):
            destination.unlink(missing_ok=True)
            app.logger.exception("Material ingestion failed")
            return jsonify(error="材料保存失败，请稍后重试"), 500
        return jsonify(material_id=material_id, message="上传成功，正文已入库"), 201

    return app
