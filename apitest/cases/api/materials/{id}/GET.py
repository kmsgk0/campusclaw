def run(c):
    assert c.request("GET", "/api/materials/1")[0] == 200
    assert c.request("GET", "/api/materials/1", user="student_b1")[0] == 404
