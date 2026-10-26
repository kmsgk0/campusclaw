import React, { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  BookOpen,
  ChevronRight,
  LoaderCircle,
  MessageSquare,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { api } from "./api.js";
import { Button, IconButton } from "./ui.jsx";

function AnswerText({ text, citations, onSource }) {
  return (
    <div className="answer-text">
      {text.split(/(\[\d+\])/g).map((part, index) => {
        const match = part.match(/^\[(\d+)\]$/);
        const citation =
          match && citations.find((item) => item.number === Number(match[1]));
        return citation ? (
          <button
            key={index}
            className="inline-citation"
            aria-label={`查看引用 ${citation.number}：${citation.title}`}
            onClick={() => onSource(citation)}
          >
            {citation.number}
          </button>
        ) : (
          <React.Fragment key={index}>{part}</React.Fragment>
        );
      })}
    </div>
  );
}

export default function Ask({ messages, setMessages, readyCount, onSource }) {
  const [question, setQuestion] = useState("");
  const end = useRef(null);
  const busy = messages.some((message) => message.status === "loading");
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [messages]);
  async function submit(event, suggestion) {
    event?.preventDefault();
    const value = (suggestion ?? question).trim();
    if (!value || busy) return;
    const id = crypto.randomUUID();
    setQuestion("");
    setMessages((previous) => [
      ...previous,
      { id, question: value, status: "loading", citations: [] },
    ]);
    try {
      const result = await api("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: value }),
      });
      setMessages((previous) =>
        previous.map((item) =>
          item.id === id ? { ...item, ...result, status: "ready" } : item,
        ),
      );
    } catch (error) {
      setMessages((previous) =>
        previous.map((item) =>
          item.id === id
            ? { ...item, status: "failed", error: error.message }
            : item,
        ),
      );
      setQuestion((previous) => previous || value);
    }
  }
  return (
    <section className="assistant assistant-full" aria-label="班级知识助手">
      <header className="assistant-header">
        <div>
          <span className="assistant-symbol">
            <Sparkles size={17} />
          </span>
          <strong>班级助手</strong>
          <span className="small-dot" />
        </div>
        <div>
          {!!messages.length && (
            <IconButton
              label="清空问答显示"
              onClick={() => setMessages([])}
              disabled={busy}
            >
              <RotateCcw size={15} />
            </IconButton>
          )}
        </div>
      </header>
      <div className="assistant-context">
        <BookOpen size={14} />
        <span>
          基于本班 <strong>{readyCount}</strong> 份已索引材料
        </span>
        <span className="context-tag">有据可查</span>
      </div>
      <div className="assistant-scroll">
        {!messages.length ? (
          <div className="assistant-empty">
            <div className="assistant-orbit">
              <Sparkles size={25} strokeWidth={1.5} />
            </div>
            <span className="eyebrow">ASK YOUR CLASSROOM</span>
            <h2>让资料，回答你的问题。</h2>
            <p>
              从本班材料中寻找答案，
              <br />
              每一处引用都可以回到原文。
            </p>
            <div className="suggestions">
              <span>可以这样问</span>
              {["磁铁能吸引木块吗？", "水蒸气冷却后会怎样？"].map((text) => (
                <button key={text} onClick={(event) => submit(event, text)}>
                  <MessageSquare size={14} />
                  <span>{text}</span>
                  <ArrowUp size={13} />
                </button>
              ))}
            </div>
            <div className="assistant-grounding">
              <ShieldCheck size={15} />
              <span>没有足够依据时，会明确告诉你。</span>
            </div>
          </div>
        ) : (
          <div className="messages">
            {messages.map((message) => (
              <article className="exchange" key={message.id}>
                <div className="question-bubble">{message.question}</div>
                <div className="assistant-reply">
                  <span className="reply-avatar">
                    <Sparkles size={14} />
                  </span>
                  <div className="reply-content">
                    <span className="reply-label">CampusClaw</span>
                    {message.status === "loading" ? (
                      <div className="answer-loading">
                        <LoaderCircle size={14} className="spin" />
                        正在查阅本班材料…
                      </div>
                    ) : message.status === "failed" ? (
                      <p className="inline-error" role="alert">
                        {message.error}
                      </p>
                    ) : (
                      <>
                        <AnswerText
                          text={message.answer}
                          citations={message.citations}
                          onSource={onSource}
                        />
                        {!!message.citations.length && (
                          <div className="citation-list">
                            <span>参考来源 · {message.citations.length}</span>
                            {message.citations.map((citation) => (
                              <button
                                key={citation.number}
                                className="citation-card"
                                onClick={() => onSource(citation)}
                              >
                                <span className="citation-number">
                                  {citation.number}
                                </span>
                                <div>
                                  <strong>{citation.title}</strong>
                                  <small>查看引用原文</small>
                                </div>
                                <ChevronRight size={14} />
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </article>
            ))}
            <div ref={end} />
          </div>
        )}
      </div>
      <div className="composer-wrap">
        <form onSubmit={submit} className="composer">
          <label className="sr-only" htmlFor="full-question">
            向本班材料提问
          </label>
          <textarea
            id="full-question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="向本班材料提问…"
            rows={2}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                submit(event);
              }
            }}
          />
          <div className="composer-toolbar">
            <span>
              <BookOpen size={13} /> 本班材料
            </span>
            <Button
              type="submit"
              size="icon"
              aria-label="发送问题"
              disabled={!question.trim() || busy}
            >
              {busy ? (
                <LoaderCircle size={16} className="spin" />
              ) : (
                <ArrowUp size={18} />
              )}
            </Button>
          </div>
        </form>
        <p className="composer-hint">每次提问独立检索 · 回答请结合原文核对</p>
      </div>
    </section>
  );
}
