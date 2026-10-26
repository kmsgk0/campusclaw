def run(c):
    code, d = c.request("GET", "/api/materials/1/chunks")
    assert code == 200 and d["chunks"]
    assert c.request("GET", "/api/materials/1/chunks", user="student_b1")[0] == 404
