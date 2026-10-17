import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { MIGRATIONS } from "./migrations";

// Uses Node's built-in SQLite (node:sqlite, Node >= 22.13): no native build step.
// It is marked experimental by Node; see README "Known limitations".

export type DB = DatabaseSync;

export function migrate(db: DB): number[] {
  db.exec("CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL)");
  const applied = new Set((db.prepare("SELECT version FROM schema_migrations").all() as { version: number }[]).map((r) => r.version));
  const ran: number[] = [];
  for (const m of [...MIGRATIONS].sort((a, b) => a.version - b.version)) {
    if (applied.has(m.version)) continue;
    db.exec("BEGIN");
    try {
      db.exec(m.sql);
      db.prepare("INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)").run(m.version, m.name, new Date().toISOString());
      db.exec("COMMIT");
      ran.push(m.version);
    } catch (e) {
      db.exec("ROLLBACK");
      throw new Error(`Migration ${m.version} (${m.name}) failed: ${(e as Error).message}`);
    }
  }
  return ran;
}

/** Open a database. Pass ":memory:" in tests. */
export function openDb(file: string): DB {
  if (file !== ":memory:") mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  if (file !== ":memory:") db.exec("PRAGMA journal_mode = WAL;");
  migrate(db);
  return db;
}

const g = globalThis as unknown as { __repoTutorDb?: DB };

/** Process-wide connection (survives Next.js dev hot reloads). Location: DATABASE_PATH, default ./data/repo-tutor.sqlite */
export function getDb(): DB {
  if (!g.__repoTutorDb) g.__repoTutorDb = openDb(process.env.DATABASE_PATH || "data/repo-tutor.sqlite");
  return g.__repoTutorDb;
}
