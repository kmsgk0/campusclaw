import React, { useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  FolderOpen,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  GraduationCap,
} from "lucide-react";
import { api, TOKEN_KEY } from "./api.js";
import { Brand, Button, ThemeToggle } from "./ui.jsx";

export default function Login({ dark, onToggleTheme }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    document.title = "登录 · CampusClaw";
  }, []);

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const result = await api("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.get("username").trim(),
          password: form.get("password"),
        }),
      });
      sessionStorage.setItem(TOKEN_KEY, result.token);
      location.assign("/");
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-page">
      <header>
        <Brand />
        <ThemeToggle dark={dark} onToggle={onToggleTheme} />
      </header>
      <div className="login-layout">
        <section className="login-copy">
          <h1>
            资料在一起，
            <br />
            思路更清晰。
          </h1>
          <p>
            阅读课堂材料，检索知识，带着原文依据提问。
            <br />
            一个属于本班的学习工作台。
          </p>
          <div className="login-features">
            <div>
              <FolderOpen size={18} />
              <span>材料集中管理</span>
            </div>
            <div>
              <MessageSquare size={18} />
              <span>回答附有出处</span>
            </div>
            <div>
              <ShieldCheck size={18} />
              <span>班级空间独立</span>
            </div>
          </div>
          <div className="mini-workspace" aria-hidden="true">
            <div className="mini-sidebar">
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className="mini-list">
              <b>课堂材料</b>
              <i />
              <i />
              <i />
            </div>
            <div className="mini-paper">
              <BookOpen size={26} />
              <b>从材料中，找到依据。</b>
              <i />
              <i />
              <i />
              <span>
                <Sparkles size={13} /> 本班知识助手
              </span>
            </div>
          </div>
        </section>
        <section className="login-card">
          <span className="login-icon">
            <GraduationCap size={26} />
          </span>
          <h2>进入学习空间</h2>
          <p>使用账号和密码登录。</p>
          <form className="login-form" onSubmit={submit} aria-busy={busy}>
            <label htmlFor="username">账号</label>
            <input
              id="username"
              name="username"
              autoComplete="username"
              placeholder="教师或学生账号"
              required
              aria-describedby={error ? "login-error" : undefined}
            />
            <label htmlFor="password">密码</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="请输入密码"
              required
              aria-describedby={error ? "login-error" : undefined}
            />
            {error && (
              <p id="login-error" className="inline-error" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" busy={busy} className="login-submit">
              {busy ? "正在登录…" : "登录学习空间"}
              <ArrowRight size={17} />
            </Button>
          </form>
        </section>
      </div>
    </main>
  );
}
