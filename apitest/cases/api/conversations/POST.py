def run(c):
    cid = c.conversation()
    assert c.scalar("SELECT user_id FROM conversations WHERE id=?", (cid,)) == 2
    assert c.request("POST", "/api/conversations", {"agent_id": 9999})[0] == 404
