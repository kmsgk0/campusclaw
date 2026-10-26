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
CREATE TABLE IF NOT EXISTS skills (id INTEGER PRIMARY KEY, name TEXT UNIQUE, enabled INTEGER NOT NULL DEFAULT 0);

CREATE TABLE IF NOT EXISTS material_indexes (
 material_id INTEGER PRIMARY KEY REFERENCES materials(id), signature TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('pending','ready','failed')), error TEXT
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
