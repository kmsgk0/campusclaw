#!/usr/bin/env python3
"""Run per-endpoint HTTP cases against isolated real Flask/MCP servers."""

import html
import importlib.util
import io
import json
from pathlib import Path
import sqlite3
import sys
import tempfile
import threading
import time
import urllib.request
import urllib.error
from werkzeug.serving import make_server

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "tests"))
from backend.app import create_app
from test_knowledge import Gateway
from qdrant_client import QdrantClient


class TestGateway(Gateway):
    def call(self, purpose, payload):
        if not any(m.get("role") == "tool" for m in payload["messages"]):
            return {
                "choices": [
                    {
                        "message": {
                            "role": "assistant",
                            "content": None,
                            "tool_calls": [
                                {
                                    "id": "one",
                                    "type": "function",
                                    "function": {
                                        "name": "tool_1",
                                        "arguments": '{"query":"方程去括号"}',
                                    },
                                }
                            ],
                        }
                    }
                ]
            }
        return {"choices": [{"message": {"role": "assistant", "content": "ready"}}]}

    def stream(self, messages):
        yield "先检查"
        yield "括号前的系数是否乘到每一项。"


class Context:
    def __init__(self, url, database, tool_url):
        self.url = url
        self.database = database
        self.tool_url = tool_url
        self.tokens = {}
        self.ids = {}

    def request(
        self, method, path, body=None, user="teacher_a", raw=None, content_type=None
    ):
        headers = {}
        if user in self.tokens:
            headers["Authorization"] = "Bearer " + self.tokens[user]
        if body is not None:
            raw = json.dumps(body).encode()
            content_type = "application/json"
        if content_type:
            headers["Content-Type"] = content_type
        req = urllib.request.Request(
            self.url + path, data=raw, headers=headers, method=method
        )
        try:
            response = urllib.request.urlopen(req, timeout=30)
        except urllib.error.HTTPError as e:
            response = e
        with response:
            data = response.read()
            status = response.status
            mime = response.headers.get("Content-Type", "")
        return status, json.loads(data) if "application/json" in mime else data.decode(
            "utf-8"
        )

    def scalar(self, sql, args=()):
        with sqlite3.connect(self.database) as conn:
            return conn.execute(sql, args).fetchone()[0]

    def login(self, user):
        code, data = self.request(
            "POST",
            "/api/login",
            {"username": user, "password": "test-password-1234"},
            user=None,
        )
        assert code == 200
        self.tokens[user] = data["token"]
        return data

    def agent(self):
        if "agent" not in self.ids:
            code, data = self.request(
                "POST",
                "/api/agents",
                {
                    "name": "HTTP 验收助手",
                    "prompt": "提供学习提示",
                    "skill_ids": [],
                    "material_ids": [],
                },
            )
            assert code == 201
            self.ids["agent"] = data["agent"]["id"]
        return self.ids["agent"]

    def conversation(self):
        if "conversation" not in self.ids:
            code, data = self.request(
                "POST",
                "/api/conversations",
                {"agent_id": self.agent()},
                user="student_a1",
            )
            assert code == 201
            self.ids["conversation"] = data["conversation"]["id"]
        return self.ids["conversation"]


def main():
    servers = []
    threads = []
    results = []

    def start(app):
        server = make_server("127.0.0.1", 0, app, threaded=True)
        servers.append(server)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        threads.append(thread)
        return f"http://127.0.0.1:{server.server_port}"

    with tempfile.TemporaryDirectory(prefix="campusclaw-http-") as temp:
        spec = importlib.util.spec_from_file_location(
            "mcp_fixture", ROOT / "mcp-server/server.py"
        )
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        tool_url = start(module.create_app("http-test-token"))
        app = create_app(
            {
                "TESTING": True,
                "DATA_DIR": Path(temp) / "data",
                "UPLOAD_DIR": Path(temp) / "uploads",
                "SEED_PASSWORD": "test-password-1234",
                "JWT_SECRET": "t" * 32,
                "EMBEDDING_DIM": 3,
                "MODEL_GATEWAY": TestGateway(),
                "QDRANT_CLIENT": QdrantClient(":memory:"),
            }
        )
        database = Path(temp) / "data/campusclaw.sqlite3"
        with sqlite3.connect(database) as conn:
            conn.row_factory = sqlite3.Row
            for row in conn.execute("SELECT id FROM materials").fetchall():
                app.extensions["knowledge"].index_material(conn, row["id"])
        ctx = Context(start(app), database, tool_url)
        for user in ("teacher_a", "teacher_b", "student_a1", "student_b1"):
            ctx.login(user)
        for path in sorted((ROOT / "apitest/cases").rglob("*.py")):
            began = time.monotonic()
            try:
                namespace = {}
                exec(compile(path.read_text(), str(path), "exec"), namespace)
                namespace["run"](ctx)
                status, detail = "PASS", ""
            except Exception as error:
                status, detail = "FAIL", str(error) or type(error).__name__
            name = str(path.relative_to(ROOT / "apitest/cases"))
            results.append((name, status, detail, time.monotonic() - began))
            print(status, name, detail)
        for server in servers:
            server.shutdown()
        for thread in threads:
            thread.join()
    output = ROOT / "apitest/reports/index.html"
    output.parent.mkdir(parents=True, exist_ok=True)
    rows = "".join(
        f"<tr><td>{html.escape(n)}</td><td>{s}</td><td>{html.escape(d)}</td><td>{elapsed:.2f}s</td></tr>"
        for n, s, d, elapsed in results
    )
    output.write_text(
        '<!doctype html><meta charset="utf-8"><title>CampusClaw HTTP checks</title><style>body{font:15px system-ui;max-width:1100px;margin:40px auto}table{border-collapse:collapse;width:100%}td,th{padding:12px;text-align:left;border-bottom:1px solid #ddd}</style><h1>CampusClaw HTTP checks</h1><p>Isolated SQLite, Qdrant and real HTTP app/tool servers; deterministic model fixture.</p><table><tr><th>Endpoint case</th><th>Result</th><th>Detail</th><th>Time</th></tr>'
        + rows
        + "</table>"
    )
    print(
        f"{sum(s == 'PASS' for _, s, _, _ in results)}/{len(results)} passed; report: {output}"
    )
    return int(any(s != "PASS" for _, s, _, _ in results))


if __name__ == "__main__":
    raise SystemExit(main())
