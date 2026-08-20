-- AdministrateMe V3 — the whole data model.
-- Seven tables: six from week 3, plus `patterns` when Plaid arrives in P6.
-- If an eighth appears, something has gone wrong.

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- Privacy boundary lives here. Your inboxes federate into your queue;
-- Laura's into hers. Members share destinations, never inboxes.
CREATE TABLE members (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'member'
);

-- One row per inbox, per member. The wizard runs once per row.
CREATE TABLE connections (
  id                    TEXT PRIMARY KEY,
  member_id             TEXT NOT NULL REFERENCES members(id),
  provider              TEXT NOT NULL,   -- gmail | outlook | imessage | whatsapp | notes | plaid
  label                 TEXT NOT NULL,
  scope                 TEXT,            -- labels, folders, or conversation ids
  read_only             INTEGER NOT NULL DEFAULT 1,
  connected_at          TEXT NOT NULL,
  wizard_completed_at   TEXT,            -- NULL = no policy yet; see I-2
  policy_coverage_pct   REAL,
  last_synced_at        TEXT
);

-- One row per thing, from any connection.
CREATE TABLE items (
  id             TEXT PRIMARY KEY,
  connection_id  TEXT NOT NULL REFERENCES connections(id),
  external_id    TEXT NOT NULL,          -- provider's id, for dedup on re-sync
  sender         TEXT,
  subject        TEXT,
  body           TEXT,
  received_at    TEXT NOT NULL,
  status         TEXT NOT NULL,          -- new | proposed | done | dropped | auto
  proposal_json  TEXT,                   -- the extraction contract, or NULL
  duplicate_of   TEXT REFERENCES items(id),
  UNIQUE (connection_id, external_id)    -- re-syncing cannot create doubles
);
CREATE INDEX items_queue  ON items (status, received_at);
CREATE INDEX items_sender ON items (sender);

-- APPEND-ONLY. Never updated, never deleted. This is what makes
-- "why is this on my calendar?" answerable forever, and it is the
-- training data every rule comes from. See I-4.
CREATE TABLE decisions (
  id          TEXT PRIMARY KEY,
  item_id     TEXT NOT NULL REFERENCES items(id),
  action      TEXT NOT NULL,             -- calendar | reminder | file | drop
  target      TEXT,                      -- which calendar, which list
  decided_at  TEXT NOT NULL,
  decided_by  TEXT NOT NULL              -- member id, "rule:<id>", or "wizard:<connection_id>"
);
CREATE INDEX decisions_item ON decisions (item_id);

-- Written by the WIZARD and by ZEROING. One table, two origins. See I-6.
CREATE TABLE rules (
  id                     TEXT PRIMARY KEY,
  member_id              TEXT NOT NULL REFERENCES members(id),
  match_connection_id    TEXT REFERENCES connections(id),
  match_sender           TEXT,           -- exact address
  match_sender_domain    TEXT,           -- everything after the @. Ships now
                                         -- because widening sender -> domain is
                                         -- routine (COLD-START "widen only
                                         -- after watching"), and adding a
                                         -- column later needs a migration,
                                         -- which is a blocked path.
  match_subject_contains TEXT,
  action                 TEXT NOT NULL,
  target                 TEXT,
  origin                 TEXT NOT NULL,  -- wizard | zeroing
  created_from_decision  TEXT REFERENCES decisions(id),
  created_at             TEXT NOT NULL,
  hits                   INTEGER NOT NULL DEFAULT 0,
  last_fired_at          TEXT,
  active                 INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX rules_match  ON rules (member_id, active, match_sender);
CREATE INDEX rules_domain ON rules (member_id, active, match_sender_domain);

-- Matchers are ANDed, and a NULL matcher is "don't care". Nothing semantic
-- ever goes in here: a scope you cannot evaluate deterministically is a scope
-- you cannot audit, and it drifts.

-- What went where, so it can be found and undone.
CREATE TABLE pushes (
  id           TEXT PRIMARY KEY,
  item_id      TEXT NOT NULL REFERENCES items(id),
  provider     TEXT NOT NULL,            -- google_calendar | google_tasks | apple_reminders
  provider_id  TEXT NOT NULL,
  idempotency  TEXT NOT NULL UNIQUE,     -- item_id + provider; a re-run cannot duplicate
  pushed_at    TEXT NOT NULL,
  undone_at    TEXT
);

-- Arrives with Plaid. Recurring things found in spending, before you rule on
-- them. Patterns, never transactions — minimum three occurrences. See I-8.
CREATE TABLE patterns (
  id           TEXT PRIMARY KEY,
  member_id    TEXT NOT NULL REFERENCES members(id),
  merchant     TEXT NOT NULL,
  cadence      TEXT NOT NULL,            -- monthly | quarterly | semiannual | annual
  occurrences  INTEGER NOT NULL,
  avg_amount   REAL,
  last_seen    TEXT,
  status       TEXT NOT NULL DEFAULT 'proposed'  -- proposed | accepted | dismissed
);
