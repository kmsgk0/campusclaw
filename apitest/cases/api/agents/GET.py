def run(c):
    code, d = c.request("GET", "/api/agents", user="student_a1")
    assert code == 200 and len(d["agents"]) >= 2
    assert all(a["class_id"] == 1 and a["enabled"] for a in d["agents"])
