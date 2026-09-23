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
