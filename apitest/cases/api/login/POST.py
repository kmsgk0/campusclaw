def run(c):
    d = c.login("teacher_a")
    assert d["token_type"] == "Bearer"
    assert (
        c.scalar(
            "SELECT COUNT(*) FROM sessions WHERE user_id=(SELECT id FROM users WHERE username='teacher_a')"
        )
        >= 1
    )
    assert (
        c.request(
            "POST",
            "/api/login",
            {"username": "teacher_a", "password": "wrong"},
            user=None,
        )[0]
        == 401
    )
