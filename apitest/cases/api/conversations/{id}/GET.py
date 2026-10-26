def run(c):
    cid = c.conversation()
    assert c.request("GET", f"/api/conversations/{cid}", user="student_a1")[0] == 200
    assert c.request("GET", f"/api/conversations/{cid}")[0] == 404
