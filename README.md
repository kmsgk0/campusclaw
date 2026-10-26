# CampusClaw

CampusClaw 为教师和学生提供按班级隔离的教学材料库与学习助手。教师上传材料、配置智能体和技能；学生阅读材料、检索知识，并通过原文引用核对回答。

后端采用 Flask、SQLite/FTS5 和 Qdrant；前端采用 React、Vite 与 Radix Dialog/Tabs。嵌入和对话模型通过兼容 OpenAI 的接口接入，外部工具通过 MCP 调用。当前为单实例应用，支持 UTF-8 `.txt`、`.md` 文件，单文件上限 2 MiB；暂不支持注册、PDF/Word 解析和作业批改。

## 启动

需要 Docker 与 Docker Compose。在项目根目录运行：

```bash
cp .env.example .env
# 填写账号初始密码、JWT 密钥、模型服务配置和 MCP 令牌
docker compose up --build -d
docker compose exec app flask --app backend.app:create_app index-materials
```

访问 `http://localhost:8080`。Compose 启动应用、Qdrant 和 MCP 工具服务，数据库、上传文件和向量保存在命名 volume 中。普通重启使用 `docker compose down` 和 `up -d`；`down -v` 会删除数据。

主要配置见 [.env.example](.env.example)：

| 配置 | 用途 |
| --- | --- |
| `SEED_PASSWORD` | 预置账号初始密码，至少 12 个字符；修改配置不会覆盖已有密码 |
| `JWT_SECRET` | JWT 签名密钥，至少 32 字节 |
| `EMBEDDING_BASE_URL`、`EMBEDDING_API_KEY`、`EMBEDDING_MODEL`、`EMBEDDING_DIM` | 嵌入服务和向量维度 |
| `CHAT_BASE_URL`、`CHAT_API_KEY`、`CHAT_MODEL` | 对话服务 |
| `MCP_AUTH_TOKEN` | 本地 MCP 服务的 Bearer 令牌 |
| `MCP_MAX_ROUNDS`、`MCP_MAX_CALLS` | 每次提问的工具轮次上限、每个会话的累计调用上限，默认 3 和 24 |
| `BIND_ADDRESS`、`HOST_PORT` | 应用监听地址和端口，默认 `127.0.0.1:8080` |

模型 Base URL 写到接口前缀，通常为 `/v1`；后端追加 `/embeddings` 或 `/chat/completions`。密钥只由服务端使用，Qdrant 不发布宿主机端口。更换嵌入模型后需重建索引；更换维度还需处理对应 Qdrant collection。

预置账号为 `teacher_a`、`student_a1`（A 班）和 `teacher_b`、`student_b1`（B 班），初始密码均来自 `SEED_PASSWORD`。教师管理本班材料和配置，学生只读材料并使用本班助手。未登录返回 401，学生上传返回 403，跨班和不存在的对象统一返回 404。退出登录立即撤销令牌。

如需示例材料和工具绑定，安装下方开发依赖后运行：

```bash
uv run python scripts/seed_demo.py
```

脚本通过 API 添加带“示例”标识的数学、语文材料，连接本地工具服务，并为尚未绑定材料的预置助手建立绑定，保留已有材料。

## 使用

材料工作台提供搜索、文件类型筛选、列表/网格、阅读和下载。上传或重建索引时可选择自动、自定义或 Markdown 标题分章切片，并查看原文位置。索引失败时保留材料，教师可重试。阅读区两侧可拖动调整宽度，也支持方向键调整和双击恢复；窄屏使用材料列表、阅读区切换和助手弹窗。支持浅色、深色主题。

“知识检索”支持关键词、向量和混合检索。“知识问答”针对当前问题检索最多四条切片，生成带引用的回答；没有有效依据时显示“资料中未找到相关内容”，不调用回答模型。点击引用可查看高亮原文。成功的嵌入结果可按班级、文本、服务、模型和维度复用，重启不重新调用模型。

“智能体对话”和阅读区助手使用持续会话。教师为智能体配置角色提示词、材料和技能；学生新建会话时选择助手。会话仅本人可见，刷新后可以恢复。每轮读取当前提示词和绑定，使用最近六条消息，每条最多 500 字。停用助手后不能新建对应会话，已有会话仍可继续。没有检索依据时仍可按角色回答，但不生成虚构引用；流式中断会明确标记。

### 技能文件

教师可以直接编写或导入 UTF-8 技能文件，例如：

```text
名称：数学解题引导
适用条件：方程,去括号,分数,单位,换算
资料：数学
工具：knowledge_search,formula_hint@campus-tools
启用：是

先理解学生已做的步骤，再提示下一步应检查什么。不要给最终答案。
```

名称、适用条件和启用状态必填，空行后为技能说明。文件最多 8000 字，说明最多 2000 字。每轮只在当前助手绑定且启用的技能中按关键词选取一条，同分取编号较小者；名称含“解题引导”的技能只给引导。引用 MCP 工具前，需要先连接对应服务。

### MCP 工具

项目自带的 `mcp-tools` 地址为 `http://mcp-tools:8090`，提供公式提示 `formula_hint` 和单位换算关系 `unit_convert`。教师在“教学配置”中登记服务、连接并发现工具，再将 `工具名@服务器名` 写入技能。

模型根据工具说明和输入结构决定调用，后端校验并执行后将结果交回模型。工具进度先于回答显示；失败不会阻断普通回答，断开服务会清空发现列表并拒绝后续调用。教师可查看本班最近 100 条调用记录。

## 开发与检查

使用 Node.js 和 uv，在项目根目录安装依赖：

```bash
uv sync
npm --prefix web ci
```

启动 Compose 后运行 `npm --prefix web run dev`，访问 `http://127.0.0.1:5174`。Vite 将 `/api` 转发到端口 8080。更新端口 8080 的应用和生产页面时，运行 `docker compose up --build -d app`。

```bash
npm --prefix web run build
uv run python -m pytest -q
uv run python apitest/run_all.py
npx --yes @fission-ai/openspec@1.14.3 validate --all --strict --no-interactive
```

`tests/` 检查后端行为。`apitest/` 按 URL 和 HTTP 方法组织检查，使用隔离数据库、内存 Qdrant、确定性模型夹具及真实 HTTP 应用/工具服务，核对响应和持久化结果；报告写入已忽略的 `apitest/reports/`。

浏览器检查使用真实 Compose 服务和模型。准备示例材料后运行：

```bash
cd web
npx playwright install chromium --only-shell
npx playwright test
```

测试从本地 `.env` 读取预置密码，在测试账号中留下会话，截图写入已忽略的 `web/test-results/`。运行镜像不包含测试与开发依赖。

## 项目结构与接口

| 路径 | 职责 |
| --- | --- |
| `backend/` | Flask 应用、材料检索、智能体、工具接入与接口文档 |
| `backend/schema.sql`、`backend/storage.py` | 统一建表定义和初始化入口 |
| `backend/templates/`、`static/dist/` | Flask 页面模板与生成的前端资源 |
| `web/src/` | 材料工作台、`Ask.jsx` 独立知识问答、`Chat.jsx` 持续会话和教师配置 |
| `mcp-server/` | 独立 MCP 工具服务 |
| `scripts/` | 示例数据准备 |
| `tests/`、`apitest/`、`web/e2e/` | 后端、HTTP 接口与浏览器检查 |
| `openspec/` | 现行功能规约和分阶段变更归档，入口见 [规约索引](openspec/README.md) |

运行后访问 `/swagger` 查看接口并试调，使用登录返回的 Bearer token 在 Authorize 中授权；机器可读定义位于 `/openapi.json`。Swagger 资源随前端构建提供，无需外部 CDN。`/health` 返回进程存活状态。

数据库、上传文件、密钥、依赖目录和构建/测试产物不进入 Git。
