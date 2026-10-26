def run(c):
    code, d = c.request("GET", "/api/skills")
    assert (
        code == 200
        and len(d["skills"]) >= 2
        and all(s["class_id"] == 1 for s in d["skills"])
    )
