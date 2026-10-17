// Ordered, append-only migrations. Never edit a migration that has shipped; add a new one.
// Applied automatically on first connection; each runs in a transaction and is recorded
// in schema_migrations so it is applied exactly once.

export interface Migration {
  version: number;
  name: string;
  sql: string;
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: "initial_schema",
    sql: `
CREATE TABLE repos (
  slug           TEXT PRIMARY KEY,            -- lower-case "owner/name"
  owner          TEXT NOT NULL,
  name           TEXT NOT NULL,
  description    TEXT NOT NULL DEFAULT '',
  stars          INTEGER NOT NULL DEFAULT 0,
  language       TEXT NOT NULL DEFAULT '',
  html_url       TEXT NOT NULL,
  default_branch TEXT NOT NULL,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
);

CREATE TABLE analyses (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_slug      TEXT NOT NULL,
  commit_sha     TEXT,                         -- revision analysed; used to detect stale results
  status         TEXT NOT NULL CHECK (status IN ('queued','processing','completed','failed')),
  error_code     TEXT,
  error_message  TEXT,
  retryable      INTEGER NOT NULL DEFAULT 0,
  analysis_json  TEXT,
  course_json    TEXT,
  lessons_json   TEXT,
  quizzes_json   TEXT,                         -- includes correct answers: never sent to the browser
  requested_by   TEXT,
  created_at     TEXT NOT NULL,
  started_at     TEXT,
  finished_at    TEXT
);
CREATE INDEX idx_analyses_repo ON analyses (repo_slug, status, id DESC);

CREATE TABLE analysis_files (
  analysis_id INTEGER NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  path        TEXT NOT NULL,
  language    TEXT,
  size        INTEGER NOT NULL,
  content     TEXT NOT NULL,                   -- bounded by GH_MAX_TOTAL_BYTES, secrets redacted
  PRIMARY KEY (analysis_id, path)
);

-- Anonymous learners: an opaque random id in an httpOnly cookie. There are no accounts yet.
CREATE TABLE learners (
  id           TEXT PRIMARY KEY,
  created_at   TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);

CREATE TABLE lesson_progress (
  learner_id   TEXT NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  repo_slug    TEXT NOT NULL,
  lesson_id    TEXT NOT NULL,
  analysis_id  INTEGER NOT NULL,
  completed_at TEXT NOT NULL,
  PRIMARY KEY (learner_id, repo_slug, lesson_id)
);

CREATE TABLE quiz_attempts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  learner_id   TEXT NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  repo_slug    TEXT NOT NULL,
  lesson_id    TEXT NOT NULL,
  analysis_id  INTEGER NOT NULL,
  answers_json TEXT NOT NULL,
  score        INTEGER NOT NULL,
  total        INTEGER NOT NULL,
  created_at   TEXT NOT NULL
);
CREATE INDEX idx_attempts_learner ON quiz_attempts (learner_id, repo_slug, lesson_id, id DESC);

CREATE TABLE repo_visits (
  learner_id       TEXT NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  repo_slug        TEXT NOT NULL,
  last_lesson_id   TEXT,
  last_accessed_at TEXT NOT NULL,
  PRIMARY KEY (learner_id, repo_slug)
);
`,
  },
];
