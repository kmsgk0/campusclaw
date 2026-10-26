PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS classes (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS users (
 id INTEGER PRIMARY KEY, username TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL,
 password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('teacher','student')),
 class_id INTEGER NOT NULL REFERENCES classes(id)
);
CREATE TABLE IF NOT EXISTS sessions (
 token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), expires_at REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS materials (
 id INTEGER PRIMARY KEY, class_id INTEGER NOT NULL REFERENCES classes(id), title TEXT NOT NULL,
 original_name TEXT NOT NULL, storage_name TEXT NOT NULL UNIQUE, size_bytes INTEGER NOT NULL,
 uploaded_by INTEGER NOT NULL REFERENCES users(id), created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE TABLE IF NOT EXISTS knowledge_entries (
 id INTEGER PRIMARY KEY, material_id INTEGER NOT NULL UNIQUE REFERENCES materials(id),
 class_id INTEGER NOT NULL REFERENCES classes(id), body_text TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS material_class ON materials(class_id,id);
CREATE TABLE IF NOT EXISTS assignments (id INTEGER PRIMARY KEY, class_id INTEGER REFERENCES classes(id), title TEXT);
CREATE TABLE IF NOT EXISTS assistants (id INTEGER PRIMARY KEY, class_id INTEGER REFERENCES classes(id), name TEXT);
CREATE TABLE IF NOT EXISTS skills (
 id INTEGER PRIMARY KEY, class_id INTEGER NOT NULL REFERENCES classes(id), name TEXT NOT NULL,
 enabled INTEGER NOT NULL DEFAULT 1, trigger_text TEXT NOT NULL DEFAULT '', description TEXT NOT NULL DEFAULT '',
 subject_text TEXT NOT NULL DEFAULT '', tools_json TEXT NOT NULL DEFAULT '[]', source_text TEXT NOT NULL DEFAULT '',
 seed_key TEXT, UNIQUE(class_id,name), UNIQUE(class_id,seed_key)
);

CREATE TABLE IF NOT EXISTS material_indexes (
 material_id INTEGER PRIMARY KEY REFERENCES materials(id), signature TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('pending','ready','failed')), error TEXT,
 options_json TEXT NOT NULL DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS knowledge_chunks (
 id INTEGER PRIMARY KEY AUTOINCREMENT, material_id INTEGER NOT NULL REFERENCES materials(id),
 chunk_index INTEGER NOT NULL, start_offset INTEGER NOT NULL, end_offset INTEGER NOT NULL,
 body_text TEXT NOT NULL, UNIQUE(material_id,chunk_index)
);
CREATE VIRTUAL TABLE IF NOT EXISTS chunk_fts USING fts5(tokens);
CREATE TABLE IF NOT EXISTS embedding_cache (
 class_id INTEGER NOT NULL REFERENCES classes(id), fingerprint TEXT NOT NULL, vector_json TEXT NOT NULL,
 PRIMARY KEY(class_id,fingerprint)
);

CREATE TABLE IF NOT EXISTS tutor_agents (
 id INTEGER PRIMARY KEY, class_id INTEGER NOT NULL REFERENCES classes(id), name TEXT NOT NULL,
 prompt TEXT NOT NULL DEFAULT '', enabled INTEGER NOT NULL DEFAULT 1, seed_key TEXT,
 UNIQUE(class_id,name), UNIQUE(class_id,seed_key)
);
CREATE TABLE IF NOT EXISTS tutor_agent_skills (
 agent_id INTEGER NOT NULL REFERENCES tutor_agents(id) ON DELETE CASCADE,
 skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE, PRIMARY KEY(agent_id,skill_id)
);
CREATE TABLE IF NOT EXISTS tutor_agent_materials (
 agent_id INTEGER NOT NULL REFERENCES tutor_agents(id) ON DELETE CASCADE,
 material_id INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE, PRIMARY KEY(agent_id,material_id)
);
CREATE TABLE IF NOT EXISTS conversations (
 id INTEGER PRIMARY KEY, class_id INTEGER NOT NULL REFERENCES classes(id), user_id INTEGER NOT NULL REFERENCES users(id),
 agent_id INTEGER NOT NULL REFERENCES tutor_agents(id), title TEXT NOT NULL DEFAULT '新的提问',
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS messages (
 id INTEGER PRIMARY KEY, conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
 role TEXT NOT NULL CHECK(role IN ('user','assistant')), content TEXT NOT NULL,
 citations_json TEXT NOT NULL DEFAULT '[]', skill_name TEXT, tools_json TEXT NOT NULL DEFAULT '[]',
 status TEXT NOT NULL DEFAULT 'complete', created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS conversation_owner ON conversations(user_id,class_id,updated_at);
CREATE INDEX IF NOT EXISTS message_conversation ON messages(conversation_id,id);
CREATE INDEX IF NOT EXISTS knowledge_class ON knowledge_entries(class_id);
