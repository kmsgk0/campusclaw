def run(c):
    aid = c.agent()
    assert (
        c.request(
            "PUT",
            f"/api/agents/{aid}",
            {"name": "HTTP 验收助手", "prompt": "请耐心解释"},
        )[0]
        == 200
    )
    assert (
        c.scalar("SELECT prompt FROM tutor_agents WHERE id=?", (aid,)) == "请耐心解释"
    )
