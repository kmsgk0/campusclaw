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

    for class_id in (1, 2):
        for subject, trigger in [
            ("数学", "方程,去括号,分数,通分,面积,应用题,未知数,行程,单位,换算"),
            ("语文", "古诗,默写,阅读,作文,中心,词语"),
        ]:
            name = subject + "解题引导"
            source = f"名称：{name}\n适用条件：{trigger}\n资料：{subject}\n工具：knowledge_search\n启用：是\n\n先理解学生已经做的步骤，指出下一步应检查什么。不要给最终答案、得数或完整解题过程。"
            conn.execute(
                "INSERT OR IGNORE INTO skills(class_id,name,trigger_text,description,subject_text,tools_json,source_text,seed_key) VALUES(?,?,?,?,?,?,?,?)",
                (
                    class_id,
                    name,
                    trigger,
                    source.split("\n\n", 1)[1],
                    subject,
                    json.dumps(["knowledge_search"]),
                    source,
                    subject,
                ),
            )
            cur = conn.execute(
                "INSERT OR IGNORE INTO tutor_agents(class_id,name,prompt,seed_key) VALUES(?,?,?,?)",
                (
                    class_id,
                    subject + "助手",
                    "你是一位耐心的"
                    + subject
                    + "学习助手。请用清楚的中文帮助学生学习。",
                    subject,
                ),
            )
            if cur.rowcount:
                sid = conn.execute(
                    "SELECT id FROM skills WHERE class_id=? AND seed_key=?",
                    (class_id, subject),
                ).fetchone()[0]
                conn.execute(
                    "INSERT INTO tutor_agent_skills VALUES(?,?)", (cur.lastrowid, sid)
                )
    conn.commit()
