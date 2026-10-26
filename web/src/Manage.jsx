import React, { useEffect, useState } from "react";
import { api } from "./api.js";
import { Button } from "./ui.jsx";
const sample =
  "名称：新的解题引导\n适用条件：方程,去括号\n资料：数学\n工具：knowledge_search\n启用：是\n\n先理解学生的问题，提示下一步，不给最终答案。";
const emptyAgent = {
  name: "",
  prompt: "",
  enabled: true,
  skill_ids: [],
  material_ids: [],
};
export default function Manage() {
  const [tab, setTab] = useState("agents"),
    [data, setData] = useState({
      agents: [],
      skills: [],
      materials: [],
      servers: [],
      calls: [],
    });
  const [agent, setAgent] = useState(emptyAgent),
    [skill, setSkill] = useState({ source_text: sample }),
    [server, setServer] = useState({
      name: "campus-tools",
      base_url: "http://mcp-tools:8090",
      token: "",
    });
  const [tools, setTools] = useState({}),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  async function reload() {
    const paths = [
      "agents",
      "skills",
      "materials",
      "mcp/servers",
      "mcp/tool-calls",
    ];
    const results = await Promise.all(paths.map((p) => api("/api/" + p)));
    setData(Object.assign({}, ...results));
  }
  useEffect(() => {
    reload().catch((e) => setError(e.message));
  }, []);
  async function act(fn, message) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
      await reload();
      setNotice(message);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const send = (url, method, body) =>
    api("/api/" + url, {
      method,
      headers: { "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  const toggle = (key, id) =>
    setAgent((a) => ({
      ...a,
      [key]: a[key].includes(id)
        ? a[key].filter((x) => x !== id)
        : [...a[key], id],
    }));
  return (
    <div className="manage-page">
      <div className="section-heading">
        <div>
          <h1>教学配置</h1>
          <p>配置助手、技能与可调用的工具。</p>
        </div>
        <a
          className="button button-outline"
          href="/swagger"
          target="_blank"
          rel="noreferrer"
        >
          接口文档
        </a>
      </div>
      <div className="manage-tabs" role="tablist" aria-label="教学配置">
        {[
          ["agents", "智能体"],
          ["skills", "技能"],
          ["servers", "工具服务"],
          ["calls", "调用记录"],
        ].map(([id, name]) => (
          <button
            role="tab"
            aria-selected={tab === id}
            key={id}
            onClick={() => {
              setTab(id);
              setError("");
              setNotice("");
            }}
          >
            {name}
          </button>
        ))}
      </div>
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="manage-notice">
          {notice}
        </p>
      )}
      {tab === "agents" && (
        <div className="manage-columns">
          <div className="manage-list">
            <Button variant="outline" onClick={() => setAgent(emptyAgent)}>
              新建智能体
            </Button>
            {data.agents.map((a) => (
              <button
                className={agent.id === a.id ? "selected" : ""}
                key={a.id}
                onClick={() => setAgent(a)}
              >
                <strong>{a.name}</strong>
                <span>
                  {a.enabled ? "已启用" : "已停用"} · {a.material_ids.length}{" "}
                  份材料
                </span>
              </button>
            ))}
          </div>
          <form
            className="config-form"
            onSubmit={(e) => {
              e.preventDefault();
              act(async () => {
                const r = await send(
                  "agents" + (agent.id ? "/" + agent.id : ""),
                  agent.id ? "PUT" : "POST",
                  agent,
                );
                setAgent(r.agent);
              }, "智能体已保存");
            }}
          >
            <h2>{agent.id ? "编辑智能体" : "新建智能体"}</h2>
            <label>
              名称
              <input
                required
                maxLength={64}
                value={agent.name}
                onChange={(e) => setAgent({ ...agent, name: e.target.value })}
              />
            </label>
            <label>
              角色提示词
              <textarea
                rows={5}
                maxLength={2000}
                value={agent.prompt}
                onChange={(e) => setAgent({ ...agent, prompt: e.target.value })}
                placeholder="描述这个助手的角色与回答方式"
              />
            </label>
            <label className="check-line">
              <input
                type="checkbox"
                checked={!!agent.enabled}
                onChange={(e) =>
                  setAgent({ ...agent, enabled: e.target.checked })
                }
              />
              启用，允许学生新建会话
            </label>
            <fieldset>
              <legend>绑定技能</legend>
              {data.skills.map((s) => (
                <label className="check-line" key={s.id}>
                  <input
                    type="checkbox"
                    checked={agent.skill_ids.includes(s.id)}
                    onChange={() => toggle("skill_ids", s.id)}
                  />
                  {s.name}
                  {!s.enabled ? "（已停用）" : ""}
                </label>
              ))}
            </fieldset>
            <fieldset>
              <legend>绑定材料</legend>
              {data.materials.map((m) => (
                <label className="check-line" key={m.id}>
                  <input
                    type="checkbox"
                    checked={agent.material_ids.includes(m.id)}
                    onChange={() => toggle("material_ids", m.id)}
                  />
                  {m.title}
                </label>
              ))}
            </fieldset>
            <Button type="submit" busy={busy}>
              保存智能体
            </Button>
          </form>
        </div>
      )}
      {tab === "skills" && (
        <div className="manage-columns">
          <div className="manage-list">
            <Button
              variant="outline"
              onClick={() => setSkill({ source_text: sample })}
            >
              新建技能
            </Button>
            {data.skills.map((s) => (
              <button
                className={skill.id === s.id ? "selected" : ""}
                key={s.id}
                onClick={() => setSkill(s)}
              >
                <strong>{s.name}</strong>
                <span>{s.enabled ? "已启用" : "已停用"}</span>
              </button>
            ))}
          </div>
          <form
            className="config-form"
            onSubmit={(e) => {
              e.preventDefault();
              act(async () => {
                const r = await send(
                  "skills" + (skill.id ? "/" + skill.id : ""),
                  skill.id ? "PUT" : "POST",
                  { source_text: skill.source_text },
                );
                setSkill(r.skill);
              }, "技能已保存，下次提问生效");
            }}
          >
            <h2>{skill.id ? "编辑技能" : "新建技能"}</h2>
            <label>
              导入技能文件
              <input
                type="file"
                accept=".md,.txt"
                onChange={async (e) => {
                  const file = e.target.files[0];
                  if (file)
                    setSkill({ ...skill, source_text: await file.text() });
                }}
              />
            </label>
            <label>
              技能内容
              <textarea
                className="skill-editor"
                rows={15}
                value={skill.source_text}
                maxLength={8000}
                onChange={(e) =>
                  setSkill({ ...skill, source_text: e.target.value })
                }
              />
            </label>
            <p>
              空行以上填写名称、适用条件、资料、工具和启用状态，空行以下填写技能说明。
            </p>
            <div className="form-actions">
              <Button type="submit" busy={busy}>
                保存技能
              </Button>
              {skill.id && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm("删除这条技能及其绑定？"))
                      act(async () => {
                        await send("skills/" + skill.id, "DELETE");
                        setSkill({ source_text: sample });
                      }, "技能已删除");
                  }}
                >
                  删除技能
                </Button>
              )}
            </div>
          </form>
        </div>
      )}
      {tab === "servers" && (
        <div className="manage-columns">
          <div className="manage-list">
            <Button
              variant="outline"
              onClick={() =>
                setServer({
                  name: "",
                  base_url: "http://mcp-tools:8090",
                  token: "",
                })
              }
            >
              登记工具服务
            </Button>
            {data.servers.map((s) => (
              <button
                className={server.id === s.id ? "selected" : ""}
                key={s.id}
                onClick={() => setServer({ ...s, token: "" })}
              >
                <strong>{s.name}</strong>
                <span>{s.connected ? "已连接" : "未连接"}</span>
              </button>
            ))}
          </div>
          <div>
            <form
              className="config-form"
              onSubmit={(e) => {
                e.preventDefault();
                act(async () => {
                  const r = await send(
                    "mcp/servers" + (server.id ? "/" + server.id : ""),
                    server.id ? "PUT" : "POST",
                    server,
                  );
                  setServer({ ...r.server, token: "" });
                }, "服务器已保存");
              }}
            >
              <h2>工具服务</h2>
              <label>
                名称
                <input
                  required
                  value={server.name}
                  onChange={(e) =>
                    setServer({ ...server, name: e.target.value })
                  }
                />
              </label>
              <label>
                服务地址
                <input
                  type="url"
                  required
                  value={server.base_url}
                  onChange={(e) =>
                    setServer({ ...server, base_url: e.target.value })
                  }
                />
              </label>
              <label>
                令牌{server.has_token ? "（已配置，留空保留）" : ""}
                <input
                  type="password"
                  autoComplete="new-password"
                  required={!server.has_token}
                  value={server.token}
                  onChange={(e) =>
                    setServer({ ...server, token: e.target.value })
                  }
                />
              </label>
              <div className="form-actions">
                <Button type="submit" busy={busy}>
                  保存服务器
                </Button>
                {server.id && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={busy}
                      onClick={() =>
                        act(async () => {
                          const r = await send(
                            `mcp/servers/${server.id}/connect`,
                            "POST",
                          );
                          setServer({ ...r.server, token: "" });
                          setTools({ ...tools, [server.id]: r.tools });
                        }, "连接成功，工具已发现")
                      }
                    >
                      连接并发现
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={busy}
                      onClick={() =>
                        act(async () => {
                          await send(
                            `mcp/servers/${server.id}/disconnect`,
                            "POST",
                          );
                          setServer({ ...server, connected: false });
                          setTools({ ...tools, [server.id]: [] });
                        }, "服务器已断开")
                      }
                    >
                      断开
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => {
                        if (
                          window.confirm(
                            "删除该服务器？已绑定的工具引用将不可用。",
                          )
                        )
                          act(async () => {
                            await send("mcp/servers/" + server.id, "DELETE");
                            setServer({ name: "", base_url: "", token: "" });
                          }, "服务器已删除");
                      }}
                    >
                      删除
                    </Button>
                  </>
                )}
              </div>
              {server.error && <p className="inline-error">{server.error}</p>}
            </form>
            {server.id && (
              <div className="discovered-tools">
                <Button
                  variant="ghost"
                  onClick={() =>
                    act(async () => {
                      const r = await api(
                        `/api/mcp/servers/${server.id}/tools`,
                      );
                      setTools({ ...tools, [server.id]: r.tools });
                    }, "工具清单已更新")
                  }
                >
                  查看工具清单
                </Button>
                {(tools[server.id] || []).map((t) => (
                  <article key={t.name}>
                    <h3>
                      {t.name}@{server.name}
                    </h3>
                    <p>{t.description}</p>
                    <details>
                      <summary>输入参数</summary>
                      <pre>{JSON.stringify(t.inputSchema, null, 2)}</pre>
                    </details>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {tab === "calls" && (
        <div className="calls-list">
          <Button
            variant="outline"
            onClick={() => act(reload, "调用记录已更新")}
          >
            刷新记录
          </Button>
          {!data.calls.length && <p>尚无工具调用记录。</p>}
          {data.calls.map((c) => (
            <article key={c.id}>
              <div>
                <strong>{c.tool_ref}</strong>
                <span>
                  {{ ok: "成功", denied: "被拒", error: "出错" }[c.status]}
                </span>
              </div>
              <p>{c.detail}</p>
              <small>
                {c.display_name} · 会话 {c.conversation_id} · 第 {c.round} 轮 ·{" "}
                {c.created_at}
              </small>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
