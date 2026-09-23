# CampusClaw

为教师和学生提供按班级隔离的教学材料库。
教师登录后上传材料，同班学生查看和下载，跨班访问被拒绝。
本次不做智能问答、向量检索、注册、作业批改和多副本部署。

## 课程与实现

第二课的规约及第三课实现位于同一仓库。后端采用 Flask、SQLite；前端采用 React、Radix Themes 与 Vite。界面是 sage/jade 配色的材料工作台，支持搜索、阅读、列表/网格、深浅色和上传弹窗。

## 启动

需要 Docker 与 Docker Compose。

```bash
cp .env.example .env
# 在 .env 中设置至少 12 位的 SEED_PASSWORD
docker compose up --build -d
```

浏览器访问 `http://localhost:8080`。预置账号为 `teacher_a`、`student_a1`、`student_b1`，初始密码均来自 `SEED_PASSWORD`。前两个账号属于 A 班，第三个属于 B 班。修改环境变量不会覆盖已有用户的密码哈希。

`GET /health` 无需登录，返回进程存活状态。数据库和文件保存在命名 volume 中，执行 `docker compose down` 后再启动仍保留数据。`down -v` 会删除数据，请勿用于普通重启。

本项目采用单实例部署。预置账号用于课程演示，请设置独立测试密码。

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
| `POST /api/login` | 校验账号密码，签发会话 Cookie |
| `GET /api/me` | 查询服务端确认的身份 |
| `POST /api/logout` | 撤销会话 |
| `GET /api/materials?q=关键词` | 搜索本班材料 |
| `POST /api/materials` | 教师上传文件 |
| `GET /api/materials/{id}` | 阅读本班材料 |
| `GET /api/materials/{id}/file` | 下载本班原文件 |

无有效登录返回 401，学生上传返回 403，跨班和不存在的材料统一返回 404。支持不超过 2 MiB 的 UTF-8 `.txt`、`.md`，不支持 PDF/Word。数据库保存文件元信息与正文，未接入大模型。

课程规约在 `openspec/`：第三课的认证与材料入库变更已归档；第四课的 `add-class-knowledge-search` 为待实施变更。

验收重点是教师上传后本班可见、学生上传返回 403、跨班访问返回 404、登出后旧会话失效，以及 Compose 重启后数据保留。`tests/test_app.py` 提供这些行为的可重复检查；浏览器操作仍须实际核对。

作业附件、取证和提交记录仅在本地保存。密钥、数据库、上传目录、构建缓存与本地 SOP 不进入 Git。
