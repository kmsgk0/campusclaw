#!/usr/bin/env python3
"""Prepare sample learning materials and connect the local Compose tool service."""

import json
import os
from pathlib import Path
import urllib.request
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")
BASE = os.getenv("CAMPUSCLAW_URL", "http://127.0.0.1:8080")


def main():
    for username in ("teacher_a", "teacher_b"):
        token = None

        def call(path, method="GET", data=None, raw=None, mime=None):
            headers = {}
            if token:
                headers["Authorization"] = "Bearer " + token
            if data is not None:
                raw = json.dumps(data).encode()
                mime = "application/json"
            if mime:
                headers["Content-Type"] = mime
            with urllib.request.urlopen(
                urllib.request.Request(
                    BASE + path, data=raw, method=method, headers=headers
                ),
                timeout=120,
            ) as response:
                return json.load(response)

        token = call(
            "/api/login",
            "POST",
            {"username": username, "password": os.environ["SEED_PASSWORD"]},
        )["token"]
        materials = call("/api/materials")["materials"]
        samples = {
            "数学自学笔记（示例）": "# 方程与单位\n\n去括号时，括号前的系数要乘到括号内每一项。方程左右两边同时加减同一个数，等式仍成立。\n\n## 单位换算\n\n1 米等于 100 厘米。先确认数量的单位，再选择换算关系。\n\n## 面积\n\n长方形面积等于长乘宽，三角形面积等于底乘高除以二。",
            "语文自学笔记（示例）": "# 阅读与写作\n\n阅读时先寻找段落中的中心句，再用自己的话概括。\n\n## 作文开头\n\n作文开头可以从一个具体场景或问题开始，避免空泛的套话。\n\n## 古诗默写\n\n先理解诗句的意思，再联系上下句的意象回忆。",
        }
        for title, body in samples.items():
            if not any(m["title"] == title for m in materials):
                raw = (
                    f'--SAMPLE\r\nContent-Disposition: form-data; name="file"; filename="{title}.md"\r\nContent-Type: text/plain\r\n\r\n{body}\r\n--SAMPLE--\r\n'
                ).encode()
                result = call(
                    "/api/materials",
                    "POST",
                    raw=raw,
                    mime="multipart/form-data; boundary=SAMPLE",
                )
                if result["index_status"] != "ready":
                    raise RuntimeError(
                        result.get("index_error") or "Sample indexing failed"
                    )
        materials = call("/api/materials")["materials"]
        servers = call("/api/mcp/servers")["servers"]
        server = next((s for s in servers if s["name"] == "campus-tools"), None)
        if server is None:
            server = call(
                "/api/mcp/servers",
                "POST",
                {
                    "name": "campus-tools",
                    "base_url": "http://mcp-tools:8090",
                    "token": os.environ["MCP_AUTH_TOKEN"],
                },
            )["server"]
        call(f"/api/mcp/servers/{server['id']}/connect", "POST")
        skills = call("/api/skills")["skills"]
        for skill in skills:
            if (
                skill.get("seed_key") == "数学"
                and "formula_hint@" not in skill["source_text"]
            ):
                source = skill["source_text"].replace(
                    "工具：knowledge_search",
                    "工具：knowledge_search,formula_hint@campus-tools,unit_convert@campus-tools",
                )
                call(f"/api/skills/{skill['id']}", "PUT", {"source_text": source})
        for agent in call("/api/agents")["agents"]:
            if agent.get("seed_key") in ("数学", "语文") and not agent["material_ids"]:
                agent["material_ids"] = [
                    m["id"]
                    for m in materials
                    if m["title"] == agent["seed_key"] + "自学笔记（示例）"
                ]
                call(f"/api/agents/{agent['id']}", "PUT", agent)
        print(username + ": sample materials, agents and tool connection ready")


if __name__ == "__main__":
    main()
