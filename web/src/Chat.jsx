import React, { useEffect, useRef, useState } from "react";
import { ArrowUp, Plus, PanelRightClose, Sparkles } from "lucide-react";
import { api, authenticatedFetch } from "./api.js";
import { Button, IconButton } from "./ui.jsx";

export default function Chat({ onSource, onClose, full = false }) {
  const [agents, setAgents] = useState([]),
    [agent, setAgent] = useState("");
  const [sessions, setSessions] = useState([]),
    [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]),
    [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const end = useRef(null);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  async function refresh() {
    const [a, c] = await Promise.all([
      api("/api/agents"),
      api("/api/conversations"),
    ]);
    setAgents(a.agents.filter((x) => x.enabled));
    setAgent((v) => v || String(a.agents.find((x) => x.enabled)?.id || ""));
    setSessions(c.conversations);
  }
  useEffect(() => {
    refresh().catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [messages]);
  async function load(id) {
    setError("");
    try {
      const r = await api(`/api/conversations/${id}`);
      setSession(r.conversation);
      setMessages(r.messages);
    } catch (e) {
      setError(e.message);
    }
  }
  async function send(e) {
    e.preventDefault();
    if (busy || question.trim().length < 2 || (!agent && !session)) return;
    const input = question.trim();
    setBusy(true);
    setError("");
    try {
      let current = session;
      if (!current) {
        current = (
          await api("/api/conversations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ agent_id: Number(agent) }),
          })
        ).conversation;
        setSession(current);
      }
      setQuestion("");
      const replyId = "pending-" + Date.now();
      setMessages((p) => [
        ...p,
        { id: "question-" + Date.now(), role: "user", content: input },
        {
          id: replyId,
          role: "assistant",
          content: "",
          citations: [],
          tool_calls: [],
          status: "streaming",
        },
      ]);
      const response = await authenticatedFetch(
        `/api/conversations/${current.id}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: input }),
        },
      );
      if (!response.ok)
        throw new Error((await response.json()).error || "提问失败");
      const reader = response.body.getReader(),
        decoder = new TextDecoder();
      let buffer = "",
        done = false;
      while (true) {
        const part = await reader.read();
        buffer += decoder.decode(part.value || new Uint8Array(), {
          stream: !part.done,
        });
        let boundary;
        while ((boundary = buffer.indexOf("\n\n")) >= 0) {
          const frame = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          const kind = frame.match(/^event: (.+)$/m)?.[1];
          const raw = frame.match(/^data: (.+)$/m)?.[1];
          if (!raw) continue;
          const data = JSON.parse(raw);
          if (kind === "error") throw new Error(data.error);
          if (kind === "done") done = true;
          if (active.current)
            setMessages((p) =>
              p.map((m) =>
                m.id !== replyId
                  ? m
                  : {
                      ...m,
                      ...(kind === "meta"
                        ? {
                            ...(data.citations
                              ? { citations: data.citations }
                              : {}),
                            ...(data.skill
                              ? { skill_name: data.skill.name }
                              : {}),
                            ...(data.tool_calls
                              ? { tool_calls: data.tool_calls }
                              : {}),
                          }
                        : {}),
                      ...(kind === "delta"
                        ? { content: m.content + data.text }
                        : {}),
                      ...(kind === "done" ? { status: "complete" } : {}),
                    },
              ),
            );
        }
        if (part.done) break;
      }
      if (!done) throw new Error("连接已结束，回答未完整生成");
      if (active.current) {
        await load(current.id);
        await refresh();
      }
    } catch (e) {
      if (active.current) {
        setError(e.message);
        setQuestion(input);
        setMessages((p) =>
          p.map((m) =>
            m.status === "streaming" ? { ...m, status: "interrupted" } : m,
          ),
        );
      }
    } finally {
      if (active.current) setBusy(false);
    }
  }
  function newSession() {
    setSession(null);
    setMessages([]);
    setError("");
  }
  return (
    <section
      className={`assistant chat-panel ${full ? "chat-full" : ""}`}
      aria-label="智能体对话"
    >
      <header className="assistant-header">
        <div>
          <Sparkles size={17} />
          <strong>
            {session
              ? sessions.find((x) => x.id === session.id)?.agent_name ||
                "学习助手"
              : "智能体对话"}
          </strong>
        </div>
        <div>
          <IconButton label="新建会话" onClick={newSession} disabled={busy}>
            <Plus size={18} />
          </IconButton>
          {onClose && (
            <IconButton label="收起知识助手" onClick={onClose} disabled={busy}>
              <PanelRightClose size={17} />
            </IconButton>
          )}
        </div>
      </header>
      <div className="chat-controls">
        <label>
          {session ? "当前会话" : "选择助手"}
          <select
            aria-label="选择助手"
            value={session ? session.agent_id : agent}
            disabled={!!session || busy}
            onChange={(e) => setAgent(e.target.value)}
          >
            {session && !agents.some((a) => a.id === session.agent_id) && (
              <option value={session.agent_id}>当前助手</option>
            )}
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          会话记录
          <select
            aria-label="会话记录"
            value={session?.id || ""}
            disabled={busy}
            onChange={(e) =>
              e.target.value ? load(e.target.value) : newSession()
            }
          >
            <option value="">新的提问</option>
            {sessions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="assistant-scroll">
        <div className="chat-messages">
          {!messages.length && (
            <div className="assistant-empty">
              <Sparkles size={30} />
              <h2>从一个问题开始</h2>
              <p>
                {agents.length
                  ? "选择助手，继续你的学习与思考。"
                  : "本班暂无启用的助手，请联系教师。"}
              </p>
            </div>
          )}
          {messages.map((m) => (
            <article
              key={m.id}
              className={m.role === "user" ? "question-bubble" : "chat-answer"}
            >
              {m.role === "assistant" && (
                <strong className="reply-label">
                  {m.skill_name || "学习助手"}
                </strong>
              )}
              {m.tool_calls?.length > 0 && (
                <div className="tool-progress">
                  {m.tool_calls.map((t, i) => (
                    <details key={i}>
                      <summary>
                        {t.ref} ·{" "}
                        {
                          { ok: "成功", denied: "被拒", error: "出错" }[
                            t.status
                          ]
                        }
                      </summary>
                      <p>{t.text}</p>
                    </details>
                  ))}
                </div>
              )}
              <p className="chat-text">
                {m.content || (m.status === "streaming" ? "正在思考…" : "")}
              </p>
              {m.status === "interrupted" && (
                <p className="inline-error">回答中断</p>
              )}
              {m.citations?.length > 0 && (
                <div className="citation-list">
                  {m.citations.map((c) => (
                    <button
                      className="citation-card"
                      key={c.number}
                      onClick={() => onSource(c)}
                    >
                      <span>{c.number}</span>
                      <div>
                        <strong>{c.title}</strong>
                        <small>切片 {c.chunk_index + 1} · 查看原文</small>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </article>
          ))}
          <div ref={end} />
        </div>
      </div>
      <div className="composer-wrap">
        {error && (
          <p role="alert" className="inline-error">
            {error}
          </p>
        )}
        <form className="composer" onSubmit={send}>
          <textarea
            aria-label="向智能体提问"
            placeholder="输入问题，Enter 发送"
            rows={2}
            maxLength={500}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing
              ) {
                e.preventDefault();
                send(e);
              }
            }}
          />
          <div className="composer-toolbar">
            <span>{busy ? "正在回答" : "会话自动保存"}</span>
            <Button
              type="submit"
              size="icon"
              aria-label="发送问题"
              busy={busy}
              disabled={question.trim().length < 2 || (!agent && !session)}
            >
              <ArrowUp size={18} />
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
