import React, { useEffect, useState } from "react";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  FileText,
  FolderOpen,
  LayoutGrid,
  Library,
  List,
  LogOut,
  MessageSquare,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import * as Tabs from "@radix-ui/react-tabs";
import { api, authenticatedFetch, TOKEN_KEY } from "./api.js";
import { date, fileKind, fileSize } from "./format.js";
import {
  Badge,
  Brand,
  Button,
  IconButton,
  Loading,
  Modal,
  ThemeToggle,
  cx,
} from "./ui.jsx";
import Chat from "./Chat.jsx";
import Manage from "./Manage.jsx";
import ChunkOptions, { defaultChunks } from "./ChunkOptions.jsx";
import Ask from "./Ask.jsx";
import SearchView from "./Search.jsx";
import SourceModal from "./SourceModal.jsx";
import WorkspaceLayout, { DEFAULT_PANE_WIDTHS } from "./WorkspaceLayout.jsx";

const sections = [
  { id: "materials", label: "材料库", icon: Library },
  { id: "search", label: "知识检索", icon: Search },
  { id: "ask", label: "知识问答", icon: MessageSquare },
  { id: "chat", label: "智能体对话", icon: Sparkles },
  { id: "manage", label: "教学配置", icon: LayoutGrid, teacherOnly: true },
];

function useCompact() {
  const [compact, setCompact] = useState(
    () => matchMedia("(max-width: 1279px)").matches,
  );
  useEffect(() => {
    const query = matchMedia("(max-width: 1279px)");
    const update = () => setCompact(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return compact;
}

export default function Workspace({ dark, onToggleTheme }) {
  const [user, setUser] = useState(null);
  const [materials, setMaterials] = useState(null);
  const [filtered, setFiltered] = useState(null);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("all");
  const [section, setSection] = useState(() =>
    sections.some((item) => item.id === location.hash.slice(1))
      ? location.hash.slice(1)
      : "materials",
  );
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [listError, setListError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const [view, setView] = useState("list");
  const [paneWidths, setPaneWidths] = useState(DEFAULT_PANE_WIDTHS);
  const [assistantOpen, setAssistantOpen] = useState(
    () => !matchMedia("(max-width: 1279px)").matches,
  );
  const [messages, setMessages] = useState([]);
  const [source, setSource] = useState(null);
  const [chunkOptions, setChunkOptions] = useState(defaultChunks);
  const [indexTarget, setIndexTarget] = useState(null);
  const [indexData, setIndexData] = useState(null);
  const [indexError, setIndexError] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [chosenFile, setChosenFile] = useState(null);
  const [notice, setNotice] = useState("");
  const [indexBusy, setIndexBusy] = useState(null);
  const [mobileReader, setMobileReader] = useState(false);
  const [revision, setRevision] = useState(0);
  const compact = useCompact();
  const teacher = user?.role === "teacher";
  const visible = (query.trim() ? filtered || [] : materials || []).filter(
    (item) =>
      kind === "all" ||
      (kind === "md"
        ? fileKind(item.original_name) === "Markdown"
        : fileKind(item.original_name) === "TXT"),
  );
  const readyCount = (materials || []).filter(
    (item) => item.index_status === "ready",
  ).length;

  function navigate(value) {
    setSection(value);
    location.hash = value;
  }
  useEffect(() => {
    const update = () => {
      const value = location.hash.slice(1);
      if (sections.some((item) => item.id === value)) setSection(value);
    };
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  useEffect(() => {
    document.title = `${sections.find((item) => item.id === section)?.label} · CampusClaw`;
  }, [section]);
  useEffect(() => {
    api("/api/me")
      .then((data) => setUser(data.user))
      .catch((error) => setListError(error.message));
  }, []);
  useEffect(() => {
    const abort = new AbortController();
    setListError("");
    api("/api/materials", { signal: abort.signal })
      .then((data) => {
        setMaterials(data.materials);
        setSelected((id) =>
          data.materials.some((item) => item.id === id)
            ? id
            : (data.materials[0]?.id ?? null),
        );
      })
      .catch((error) => {
        if (error.name !== "AbortError") setListError(error.message);
      });
    return () => abort.abort();
  }, [revision]);
  useEffect(() => {
    const abort = new AbortController();
    if (!query.trim()) {
      setFiltered(null);
      return () => abort.abort();
    }
    setFiltered(null);
    setListError("");
    api(`/api/materials?q=${encodeURIComponent(query.trim())}`, {
      signal: abort.signal,
    })
      .then((data) => setFiltered(data.materials))
      .catch((error) => {
        if (error.name !== "AbortError") setListError(error.message);
      });
    return () => abort.abort();
  }, [query, revision]);
  useEffect(() => {
    setDetail(null);
    setDetailError("");
    setDownloadError("");
    if (!selected) return;
    const abort = new AbortController();
    api(`/api/materials/${selected}`, { signal: abort.signal })
      .then(setDetail)
      .catch((error) => {
        if (error.name !== "AbortError") setDetailError(error.message);
      });
    return () => abort.abort();
  }, [selected]);
  async function logout() {
    try {
      await api("/api/logout", { method: "POST" });
      sessionStorage.removeItem(TOKEN_KEY);
      location.assign("/login");
    } catch (error) {
      setNotice(error.message);
    }
  }
  async function download() {
    setDownloadError("");
    try {
      const response = await authenticatedFetch(
        `/api/materials/${selected}/file`,
      );
      if (!response.ok)
        throw new Error((await response.json()).error || "下载未完成");
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = detail.material.original_name;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setDownloadError(error.message);
    }
  }
  async function upload(event) {
    event.preventDefault();
    if (!chosenFile || uploadBusy) return;
    setUploadBusy(true);
    setUploadError("");
    const body = new FormData();
    body.set("file", chosenFile);
    Object.entries(chunkOptions).forEach(([key, value]) =>
      body.set(key, String(value)),
    );
    try {
      const result = await api("/api/materials", { method: "POST", body });
      setSelected(result.material_id);
      setQuery("");
      setKind("all");
      setRevision((value) => value + 1);
      setChosenFile(null);
      setUploadOpen(false);
      navigate("materials");
      setMobileReader(true);
      setNotice(
        result.index_status === "ready"
          ? "材料已上传，本班成员可以阅读、检索和提问。"
          : `${result.message}：${result.index_error}`,
      );
    } catch (error) {
      setUploadError(error.message);
    } finally {
      setUploadBusy(false);
    }
  }
  async function reindex(id, config = defaultChunks) {
    setIndexBusy(id);
    try {
      await api(`/api/materials/${id}/index`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (indexTarget) setIndexData(await api(`/api/materials/${id}/chunks`));
      setRevision((value) => value + 1);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setIndexBusy(null);
    }
  }
  async function inspectIndex(id) {
    setIndexTarget(id);
    setIndexData(null);
    setIndexError("");
    try {
      const data = await api(`/api/materials/${id}/chunks`);
      setIndexData(data);
      setChunkOptions({ ...defaultChunks, ...data.options });
    } catch (error) {
      setIndexError(error.message);
    }
  }
  function openMaterial(id) {
    setSelected(id);
    setMobileReader(true);
    navigate("materials");
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        跳到主要内容
      </a>
      <aside className="sidebar">
        <Brand />
        <div className="workspace-card">
          <span className="class-avatar">{user?.class_name?.[0] || "…"}</span>
          <div>
            <strong>{user?.class_name || "正在加载"}</strong>
            <span>班级学习空间</span>
          </div>
          <ShieldCheck size={14} />
        </div>
        <span className="nav-label">工作空间</span>
        <nav aria-label="工作空间">
          {sections
            .filter((item) => !item.teacherOnly || teacher)
            .map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                className={cx("nav-item", section === id && "active")}
                onClick={() => navigate(id)}
                aria-current={section === id ? "page" : undefined}
                title={label}
              >
                <Icon size={18} strokeWidth={1.7} />
                <span>{label}</span>
                {id === "materials" && materials && (
                  <small>{materials.length}</small>
                )}
              </button>
            ))}
        </nav>
        {teacher && (
          <Button
            variant="outline"
            className="sidebar-upload"
            onClick={() => setUploadOpen(true)}
          >
            <Plus size={16} />
            <span>上传教学材料</span>
          </Button>
        )}
        <div className="sidebar-bottom">
          <div className="user-card">
            <span
              className={cx("user-avatar", teacher ? "teacher" : "student")}
            >
              {teacher ? "教" : "学"}
            </span>
            <div>
              <strong>{user?.display_name || "正在加载"}</strong>
              <span>{user?.username}</span>
            </div>
            <IconButton label="退出登录" onClick={logout}>
              <LogOut size={16} />
            </IconButton>
          </div>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="topbar">
          <div className="breadcrumbs">
            <span>学习空间</span>
            <ChevronRight size={13} />
            <span>{user?.class_name || "…"}</span>
            <ChevronRight size={13} />
            <strong>
              {sections.find((item) => item.id === section)?.label}
            </strong>
          </div>
          <div className="topbar-right">
            <ThemeToggle dark={dark} onToggle={onToggleTheme} />
            <span className="connection-state">
              <span />
              班级空间
            </span>
            <Badge>{teacher ? "教师" : "学生"}</Badge>
          </div>
        </header>
        {notice && (
          <div className="notice" role="status">
            <Check size={15} />
            <span>{notice}</span>
            <IconButton label="关闭提示" onClick={() => setNotice("")}>
              <X size={14} />
            </IconButton>
          </div>
        )}
        <main
          id="main-content"
          className={cx("main-content", notice && "with-notice")}
        >
          {section === "materials" && (
            <>
              <div className="library-heading">
                <div>
                  <h1>
                    材料库<span>{materials?.length ?? "…"}</span>
                  </h1>
                  <p>本班共享的教学资料，阅读与问答都在这里。</p>
                </div>
                <div>
                  <Button
                    variant={assistantOpen ? "soft" : "outline"}
                    onClick={() => setAssistantOpen(!assistantOpen)}
                    aria-label={assistantOpen ? "收起知识助手" : "打开知识助手"}
                  >
                    <Sparkles size={16} />
                    <span>知识助手</span>
                    {assistantOpen ? (
                      <PanelRightClose size={15} />
                    ) : (
                      <PanelRightOpen size={15} />
                    )}
                  </Button>
                  {teacher && (
                    <Button
                      onClick={() => setUploadOpen(true)}
                      className="heading-upload"
                    >
                      <Plus size={17} />
                      <span>上传材料</span>
                    </Button>
                  )}
                </div>
              </div>
              <WorkspaceLayout
                widths={paneWidths}
                onResize={setPaneWidths}
                withAssistant={assistantOpen && !compact}
                mobileReader={mobileReader}
              >
                <section className="file-pane" aria-label="材料列表">
                  <div className="file-pane-header">
                    <div>
                      <strong>全部材料</strong>
                      <div>
                        <IconButton
                          label="列表视图"
                          className={view === "list" ? "selected" : ""}
                          onClick={() => setView("list")}
                        >
                          <List size={15} />
                        </IconButton>
                        <IconButton
                          label="卡片视图"
                          className={view === "grid" ? "selected" : ""}
                          onClick={() => setView("grid")}
                        >
                          <LayoutGrid size={14} />
                        </IconButton>
                      </div>
                    </div>
                    <label className="material-search">
                      <Search size={15} />
                      <input
                        id="material-search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="搜索标题或正文"
                        aria-label="搜索标题或正文"
                      />
                      {query && (
                        <IconButton
                          label="清除搜索"
                          onClick={() => setQuery("")}
                        >
                          <X size={12} />
                        </IconButton>
                      )}
                    </label>
                    <Tabs.Root value={kind} onValueChange={setKind}>
                      <Tabs.List
                        className="file-kind-tabs"
                        aria-label="材料类型"
                      >
                        <Tabs.Trigger value="all">全部</Tabs.Trigger>
                        <Tabs.Trigger value="md">Markdown</Tabs.Trigger>
                        <Tabs.Trigger value="txt">TXT</Tabs.Trigger>
                      </Tabs.List>
                    </Tabs.Root>
                  </div>
                  <div
                    className={cx("file-list", view === "grid" && "file-grid")}
                  >
                    {listError ? (
                      <div className="pane-error">
                        <p role="alert">{listError}</p>
                        <Button
                          variant="outline"
                          size="small"
                          onClick={() => setRevision((value) => value + 1)}
                        >
                          重新加载
                        </Button>
                      </div>
                    ) : materials === null ||
                      (query.trim() && filtered === null) ? (
                      <Loading />
                    ) : !visible.length ? (
                      <div className="empty-state">
                        <FolderOpen size={27} />
                        <strong>
                          {query || kind !== "all"
                            ? "没有匹配的材料"
                            : "还没有教学材料"}
                        </strong>
                        <p>
                          {query || kind !== "all"
                            ? "试试其他关键词或文件类型。"
                            : "教师上传后，材料会显示在这里。"}
                        </p>
                        {(query || kind !== "all") && (
                          <Button
                            size="small"
                            variant="outline"
                            onClick={() => {
                              setQuery("");
                              setKind("all");
                            }}
                          >
                            清除筛选
                          </Button>
                        )}
                      </div>
                    ) : (
                      visible.map((item) => (
                        <div
                          key={item.id}
                          className={cx(
                            "file-item",
                            selected === item.id && "active",
                          )}
                        >
                          <button
                            className="file-item-main"
                            onClick={() => {
                              setSelected(item.id);
                              setMobileReader(true);
                            }}
                            aria-pressed={selected === item.id}
                          >
                            <span
                              className={cx(
                                "file-icon",
                                fileKind(item.original_name) === "TXT" &&
                                  "file-txt",
                              )}
                            >
                              <FileText size={20} strokeWidth={1.6} />
                            </span>
                            <span className="file-item-copy">
                              <strong title={item.title}>{item.title}</strong>
                              <small>
                                {fileKind(item.original_name)}
                                <span>·</span>
                                {fileSize(item.size_bytes)}
                              </small>
                              <span className="file-item-meta">
                                <span>{item.author}</span>
                                <time>{date(item.created_at)}</time>
                              </span>
                              <span
                                className={cx(
                                  "index-status",
                                  item.index_status !== "ready" &&
                                    "index-pending",
                                )}
                              >
                                <span />
                                {item.index_status === "ready"
                                  ? "已索引"
                                  : item.index_status === "failed"
                                    ? "索引失败"
                                    : "等待索引"}
                              </span>
                            </span>
                          </button>
                          {teacher && item.index_status !== "ready" && (
                            <div className="index-retry">
                              <p>
                                {item.index_error ||
                                  "完成索引后可用于检索与问答。"}
                              </p>
                              <Button
                                size="small"
                                variant="outline"
                                busy={indexBusy === item.id}
                                disabled={indexBusy !== null}
                                onClick={() => reindex(item.id)}
                              >
                                建立索引
                              </Button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                  <div className="file-pane-footer">
                    <span>{visible.length} 份材料</span>
                  </div>
                </section>
                <section className="reader" aria-label="材料阅读">
                  <header className="reader-toolbar">
                    <div>
                      <IconButton
                        label="返回材料列表"
                        className="back-to-list"
                        onClick={() => setMobileReader(false)}
                      >
                        <ArrowLeft size={17} />
                      </IconButton>
                      <FileText size={16} />
                      <span>
                        {detail?.material.original_name || "材料阅读"}
                      </span>
                    </div>
                    {detail && (
                      <Button
                        size="small"
                        variant="ghost"
                        onClick={() => inspectIndex(selected)}
                      >
                        切片与索引
                      </Button>
                    )}
                    {detail && (
                      <IconButton label="下载原文件" onClick={download}>
                        <ArrowDownToLine size={17} />
                      </IconButton>
                    )}
                  </header>
                  <div className="reader-scroll">
                    {detailError ? (
                      <div className="pane-error" role="alert">
                        {detailError}
                      </div>
                    ) : detail ? (
                      <article className="reading-paper">
                        <div className="reading-meta">
                          <Badge>
                            {fileKind(detail.material.original_name)}
                          </Badge>
                          <span>{detail.material.author}</span>
                          <span>更新于 {date(detail.material.created_at)}</span>
                        </div>
                        <div className="paper-body">
                          {detail.rendered_html !== null ? (
                            <div
                              className="prose"
                              dangerouslySetInnerHTML={{
                                __html: detail.rendered_html,
                              }}
                            />
                          ) : (
                            <>
                              <h2>{detail.material.title}</h2>
                              <pre>{detail.material.body_text}</pre>
                            </>
                          )}
                        </div>
                        <div className="paper-end">
                          <span />
                          <BookOpen size={16} />
                          <span />
                        </div>
                        <footer className="reading-footer">
                          <span>
                            <ShieldCheck size={13} />
                            {user?.class_name}共享材料
                          </span>
                          <Button
                            size="small"
                            variant="ghost"
                            onClick={() => setAssistantOpen(true)}
                          >
                            <Sparkles size={14} />
                            围绕本班资料提问
                            <ArrowRight size={13} />
                          </Button>
                        </footer>
                        {downloadError && (
                          <p className="inline-error" role="alert">
                            {downloadError}
                          </p>
                        )}
                      </article>
                    ) : selected ? (
                      <Loading label="正在打开材料" />
                    ) : (
                      <div className="empty-state reader-empty">
                        <BookOpen size={38} strokeWidth={1.4} />
                        <h2>从一份材料开始</h2>
                        <p>选择左侧材料，在这里阅读原文。</p>
                      </div>
                    )}
                  </div>
                  <footer className="reader-status">
                    <span>
                      <span className="small-dot" />
                      原始材料
                    </span>
                    <span>阅读 · 理解 · 核对</span>
                  </footer>
                </section>
                {assistantOpen && !compact && (
                  <aside className="assistant-aside">
                    <Chat
                      onSource={setSource}
                      onClose={() => setAssistantOpen(false)}
                    />
                  </aside>
                )}
              </WorkspaceLayout>
            </>
          )}
          <div className="persistent-section" hidden={section !== "search"}>
            <SearchView onSource={setSource} onOpenMaterial={openMaterial} />
          </div>
          {section === "chat" && (
            <div className="chat-page">
              <Chat onSource={setSource} full />
            </div>
          )}
          {section === "manage" && teacher && <Manage />}
          {section === "ask" && (
            <div className="ask-page">
              <div className="section-heading">
                <span className="section-icon">
                  <MessageSquare size={22} />
                </span>
                <div>
                  <h1>知识问答</h1>
                  <p>带着问题读材料，让每个回答都有出处。</p>
                </div>
              </div>
              <div className="full-assistant-frame">
                <Ask
                  messages={messages}
                  setMessages={setMessages}
                  readyCount={readyCount}
                  onSource={setSource}
                />
              </div>
            </div>
          )}
        </main>
      </div>
      {compact && (
        <Modal
          open={assistantOpen && section === "materials"}
          onOpenChange={setAssistantOpen}
          title="班级助手"
          description="根据本班已索引材料回答，并提供原文引用。"
          side
          className="assistant-modal"
        >
          <Chat onSource={setSource} />
        </Modal>
      )}
      <Modal
        open={indexTarget !== null}
        onOpenChange={(open) => {
          if (!open) setIndexTarget(null);
        }}
        title="切片与索引"
        description="查看检索片段及其在原文中的位置。"
      >
        {indexError && <p className="inline-error">{indexError}</p>}
        {teacher && (
          <>
            <ChunkOptions value={chunkOptions} onChange={setChunkOptions} />
            <Button
              busy={indexBusy !== null}
              onClick={() => reindex(indexTarget, chunkOptions)}
            >
              按此策略重建索引
            </Button>
          </>
        )}
        {indexData ? (
          <div className="chunk-list">
            {indexData.chunks.map((part) => (
              <article key={part.id}>
                <strong>切片 {part.chunk_index + 1}</strong>
                <p>{part.text}</p>
                <Button
                  variant="ghost"
                  size="small"
                  onClick={() => {
                    setSource({
                      ...part,
                      material_id: indexTarget,
                      title: materials.find((m) => m.id === indexTarget)?.title,
                    });
                    setIndexTarget(null);
                  }}
                >
                  查看原文位置 {part.start_offset} 至 {part.end_offset}
                </Button>
              </article>
            ))}
          </div>
        ) : (
          !indexError && <Loading />
        )}
      </Modal>
      <SourceModal
        source={source}
        onClose={() => setSource(null)}
        onOpenMaterial={openMaterial}
      />
      <Modal
        open={uploadOpen}
        onOpenChange={(open) => {
          if (!uploadBusy) {
            setUploadOpen(open);
            if (!open) {
              setChosenFile(null);
              setUploadError("");
            }
          }
        }}
        title="上传教学材料"
        description="分享给本班成员，上传后自动建立检索索引。"
        className="upload-modal"
        closeDisabled={uploadBusy}
      >
        <form onSubmit={upload}>
          <label
            className={cx("upload-dropzone", chosenFile && "has-file")}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              if (!uploadBusy)
                setChosenFile(event.dataTransfer.files[0] || null);
            }}
          >
            <input
              type="file"
              name="file"
              accept=".md,.txt"
              disabled={uploadBusy}
              onChange={(event) => {
                setChosenFile(event.target.files[0] || null);
                setUploadError("");
              }}
            />
            <span className="upload-symbol">
              {chosenFile ? <FileText size={26} /> : <Upload size={26} />}
            </span>
            <strong>
              {chosenFile ? chosenFile.name : "点击选择文件，或拖拽到这里"}
            </strong>
            <span>
              {chosenFile
                ? fileSize(chosenFile.size)
                : "支持 Markdown、TXT · UTF-8 · 最大 2 MiB"}
            </span>
          </label>
          <ChunkOptions value={chunkOptions} onChange={setChunkOptions} />
          {uploadError && (
            <p className="inline-error" role="alert">
              {uploadError}
            </p>
          )}
          <div className="upload-info">
            <ShieldCheck size={15} />
            <span>材料保存在本班空间。索引完成后，可用于检索与问答。</span>
          </div>
          <div className="modal-footer">
            <Button
              type="button"
              variant="outline"
              disabled={uploadBusy}
              onClick={() => setUploadOpen(false)}
            >
              取消
            </Button>
            <Button type="submit" disabled={!chosenFile} busy={uploadBusy}>
              {uploadBusy ? "上传并建立索引…" : "上传材料"}
              {!uploadBusy && <ArrowRight size={15} />}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
