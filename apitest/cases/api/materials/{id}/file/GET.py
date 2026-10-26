def run(c):
    assert "A 班" in c.request("GET", "/api/materials/1/file")[1]
    assert c.request("GET", "/api/materials/1/file", user=None)[0] == 401
