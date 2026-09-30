# CampusClaw

为教师和学生提供按班级隔离的教学材料库。
教师登录后上传材料，同班学生查看和下载，跨班访问被拒绝。
支持关键词、向量与混合检索，以及带原文引用的简短问答。暂不支持注册和多副本部署。

## 技术栈

账号认证、班级隔离与材料管理的规约和实现位于同一仓库，认证采用 JWT Bearer token。后端采用 Flask、SQLite；前端采用 React、Radix Themes 与 Vite。界面是 sage/jade 配色的材料工作台，支持搜索、阅读、列表/网格、深浅色和上传弹窗。

## 启动

需要 Docker 与 Docker Compose。

```bash
cp .env.example .env
# 设置 SEED_PASSWORD、JWT_SECRET，以及 .env.example 中的向量和对话服务配置
docker compose up --build -d
docker compose exec app flask --app app:create_app index-materials
```

浏览器访问 `http://localhost:8080`。预置账号为 `teacher_a`、`student_a1`、`student_b1`，初始密码均来自 `SEED_PASSWORD`。前两个账号属于 A 班，第三个属于 B 班。修改环境变量不会覆盖已有用户的密码哈希。

`GET /health` 无需登录，返回进程存活状态。数据库和文件保存在命名 volume 中，执行 `docker compose down` 后再启动仍保留数据。`down -v` 会删除数据，请勿用于普通重启。

本项目采用单实例部署。预置账号用于功能演示，请设置独立测试密码与至少 32 字节的 `JWT_SECRET`。

## 本地开发与检查

```bash
npm --prefix web ci
npm --prefix web run build
uv sync
uv run gunicorn --bind 127.0.0.1:8080 --workers 1 --threads 4 'app:create_app()'
uv run python -m pytest -q
```

页面入口为 `/login` 和 `/`。API：

| 方法和路径 | 用途 |
| --- | --- |
| `POST /api/login` | 校验账号密码，返回 Bearer token |
| `GET /api/me` | 查询服务端确认的身份 |
| `POST /api/logout` | 撤销会话 |
| `GET /api/materials?q=关键词` | 搜索本班材料 |
| `POST /api/materials` | 教师上传文件 |
| `GET /api/materials/{id}` | 阅读本班材料 |
| `GET /api/materials/{id}/file` | 下载本班原文件 |

无有效登录返回 401，学生上传返回 403，跨班和不存在的材料统一返回 404。支持不超过 2 MiB 的 UTF-8 `.txt`、`.md`，不支持 PDF/Word。数据库保存文件元信息与正文，未接入大模型。

登录返回 `token`、`token_type: Bearer` 和 `expires_in`。前端将 token 保存在当前标签页的 `sessionStorage`，后续 API 和文件下载请求携带 `Authorization: Bearer <token>`。服务端校验 JWT 签名与八小时有效期，再从数据库确认角色和班级；退出登录会撤销 token。页面刷新保留当前标签页的登录状态，关闭标签页后需重新登录。

功能规约在 `openspec/`，覆盖认证、班级隔离、材料管理、知识检索与引用问答。

验收重点是教师上传后本班可见、学生上传返回 403、跨班访问返回 404、登出后旧会话失效，以及 Compose 重启后数据保留。`tests/test_app.py` 检查 API 认证、权限和数据行为；Compose 重启持久化与浏览器操作需要在实际环境中核对。

密钥、数据库、上传文件和构建缓存不进入 Git。

## 知识检索与问答

材料库中的「知识检索」提供关键词、语义和混合三种方式；「知识问答」先混合检索本班材料，再使用最多四条切片生成带编号引用的简短回答。点击「查看原文」可核对高亮片段。没有有效命中时显示「资料中未找到相关内容」，不调用回答模型。

正文自动按最多 800 个 Unicode 字符切分，重叠 80 字并优先在自然边界断开。SQLite 保存原文、切片和中文二元词/英文词 FTS5 索引；Qdrant 保存向量。向量检索使用余弦相似度阈值 0.35，混合检索以 RRF（k=60）融合。字符范围左闭右开，切片编号从 0 开始。

配置 `EMBEDDING_BASE_URL`、`EMBEDDING_API_KEY`、`EMBEDDING_MODEL`、`EMBEDDING_DIM` 和 `CHAT_BASE_URL`、`CHAT_API_KEY`、`CHAT_MODEL`。Base URL 写到兼容接口前缀（通常为 `/v1`），应用分别追加 `/embeddings` 与 `/chat/completions`。模型密钥只由后端使用，Qdrant 不发布宿主机端口。

上传先保存材料，再建立索引。失败时保留材料并明确显示索引状态，教师可点击「建立索引」重试；索引未就绪时查询会提示先完成索引。首次部署运行上面的补索引命令。重启不调用模型，相同班级中相同文本的成功向量结果会按服务、模型与维度复用，避免重复计算。更改向量模型时须重新索引；更改维度还需迁移对应 Qdrant collection，不能混用旧向量。

| 方法和路径 | 用途 |
| --- | --- |
| `GET /api/search?q=内容&mode=hybrid&page=1` | 分页检索本班就绪切片，每页 20 条 |
| `POST /api/ask` | JSON 中提交 `question`，返回 `answer` 和 `citations` |
| `POST /api/materials/{id}/index` | 教师重新建立本班材料索引 |

网关错误、额度不足和无效引用会明确报错，不自动重试或切换服务。回答输出预算为 512 token。服务日志仅记录接口返回的 token 用量，不记录问题、原文或密钥。`docker compose logs app` 可查看用量；未返回用量的接口不会被记作零消耗。
