import json
from pathlib import Path
from werkzeug.security import generate_password_hash


def initialize(conn, password, upload_dir):
    conn.executescript(Path(__file__).with_name("schema.sql").read_text())
    if not conn.execute("SELECT 1 FROM users LIMIT 1").fetchone():
        conn.executemany(
            "INSERT INTO classes(id, name) VALUES (?, ?)",
            [(1, "A 班"), (2, "B 班")],
        )
        password_hash = generate_password_hash(password, method="scrypt")
        conn.executemany(
            "INSERT INTO users(username, display_name, password_hash, role, class_id) VALUES (?, ?, ?, ?, ?)",
            [
                ("teacher_a", "A 班教师", password_hash, "teacher", 1),
                ("student_a1", "A 班学生", password_hash, "student", 1),
                ("student_b1", "B 班学生", password_hash, "student", 2),
                ("teacher_b", "B 班教师", password_hash, "teacher", 2),
            ],
        )
        for class_id in (1, 2):
            letter = "A" if class_id == 1 else "B"
            body = f"# {letter} 班学习材料\n\n这是 {letter} 班的预置教学材料。\n\n## 本周学习内容\n\n- 理解身份认证与角色权限\n- 认识班级数据隔离\n- 完成教学材料的上传与入库\n\n> 本材料仅对本班成员开放。\n"
            filename = f"seed-{class_id}.md"
            (upload_dir / filename).write_text(body, encoding="utf-8")
            cur = conn.execute(
                "INSERT INTO materials(class_id,title,original_name,storage_name,size_bytes,uploaded_by) VALUES(?,?,?,?,?,?)",
                (
                    class_id,
                    f"{letter} 班学习材料",
                    f"{letter}班学习材料.md",
                    filename,
                    len(body.encode()),
                    1 if class_id == 1 else 3,
                ),
            )
            conn.execute(
                "INSERT INTO knowledge_entries(material_id,class_id,body_text) VALUES(?,?,?)",
                (cur.lastrowid, class_id, body),
            )

    conn.commit()
