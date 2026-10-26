def run(c):
    cid = c.conversation()
    assert any(
        x["id"] == cid
        for x in c.request("GET", "/api/conversations", user="student_a1")[1][
            "conversations"
        ]
    )
    assert c.request("GET", "/api/conversations")[1]["conversations"] == []
