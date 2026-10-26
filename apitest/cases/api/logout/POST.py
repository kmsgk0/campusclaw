def run(c):
    c.login("teacher_b")
    assert c.request("POST", "/api/logout", user="teacher_b")[0] == 200
    assert c.request("GET", "/api/me", user="teacher_b")[0] == 401
    c.login("teacher_b")
