# Build prompts

Eight prompts: P0 installs the harness, P1–P7 build the product. Each is one
agent run in a chat project connected to your repo.
Together they produce the runtime infrastructure and the dashboard, and leave
the repo in a state where **Phase 2 — the issue → build → review → release loop
— works.**

Read `docs/ARCHITECTURE.md` first. It is the source of truth these prompts are
generated from; if a prompt and it ever disagree, it wins.

```
  P0  install the harness           ~5 min   no app code
  P1  THE SPINE — all of it         ~30 min  no AI. The only spine prompt
  P2  the model call                 leaf     fills the draft slot
  P3  rules — the learning loop      leaf     fills Gate 2 ← the product
  P4  the New Connection Wizard      leaf     UI over the same rules table
  P5  connect everything             leaf     adapters + fills Gate 1
  P6  Plaid, Notes, Today            leaf     adapters + fills Gate 3
  P7  reply debt · supersede         leaf     detectors + ordering
  ──────────────────────────────────────
  then: Phase 2, one issue at a time, forever
```

Paste one at a time. Read the PR. Merge before the next. If a done-when list
isn't satisfied, say so in the same chat and let it finish — each prompt assumes
the previous floor holds.

---

## P0 — Install the harness

> Read `START-HERE.md` and `playbooks/00-bootstrap-repo.md` from the attached
> kit and follow the playbook exactly.
>
> My repo is `<owner>/<repo>` and it is empty. My GitHub username is `<username>`.
>
> Write every file from the kit into the repo on branch `harness-bootstrap`,
> replacing `@OWNER` throughout. Run `node scripts/selfcheck.mjs` — it must exit
> 0. Open a pull request. Do not create `package.json` and do not scaffold any
> application code. Report what you pushed and stop.

**Done when:** self-check exits 0 · `checks` is green reporting
`SKIP — no application scaffolded yet` · labelling an issue `build` is refused
because `stage` is not `operating`.

---

## P1 — The machine, against a deliberately tiny scope

> Read `docs/ARCHITECTURE.md`, `docs/SCHEMA.sql` and `harness.toml` completely
> before writing anything.
>
> **Write the invariant tests first.** Create `tests/invariants/` with one
> failing test per invariant I-1 to I-9 in ARCHITECTURE.md. Each must fail for
> the reason the invariant names, with its id in the failure message. Commit
> them red, then build until they pass. I-8 may be skipped until P6 — mark it
> pending, don't delete it.
>
> Then build:
>
> - **`db/`** — SQLite, schema exactly as `docs/SCHEMA.sql`, **encrypted at
>   rest**: use `better-sqlite3-multiple-ciphers` with the key in `.env` on the
>   mini. V2 ships SQLcipher and this database will hold both members'
>   correspondence — plaintext would be a silent regression. If you instead
>   rely on FileVault, say so in the PR body as a decision, not a default.
>   `db/migrations/001_init.sql` is that file. Migrations are a blocked path;
>   never edit one after it ships, add a new one.
> - **`server/`** — Express. JSON API for the queue and the dispositions.
>   Sessions are not needed; it binds to localhost and is reached only through
>   `tailscale serve` (see `docs/TOPOLOGY.md` — a raw port would bypass the
>   identity header). Secrets come from the macOS Keychain at start
>   (`security find-generic-password`), `.env` as documented fallback.
>   Ship `launchd/com.administrateme.server.plist`,
>   `launchd/com.administrateme.bridge.plist` and `scripts/provision.sh` per
>   TOPOLOGY so launch survives reboot without a human.
> - **`app/`** — React + Vite + Tailwind. **The directory must be called exactly
>   `app`** — it is `[stack] app_dir` in `harness.toml`, which CI's app-exists
>   probe reads. Scaffold somewhere else and every check reports SKIP and passes
>   while testing nothing.
>
> These four names are pinned too, because the lane classifier, the docs and the
> troubleshooting page all reference them: **`tests/e2e/`** (Playwright),
> **`tests/invariants/`**, **`adapters/`**, **`policy/`**. Use exactly those.
> - **A member switch, and every query scoped by it.** No login, no sessions,
>   no auth code (that stays a blocked path). Bind the member to the Tailscale
>   identity header (`Tailscale-User-Login` when served via `tailscale serve`)
>   — the mechanism V2 already uses — with a manual switch as fallback. I-7 is
>   enforced in the query layer: what must be impossible is Laura's items
>   appearing in my queue, and that is a `WHERE member_id = ?` you can write a
>   test against.
> - **The intake pipeline, complete, with all four gate slots wired in their
>   permanent order** — this is the spine's centerline and no later prompt may
>   reorder it: Gate 1 (hostile/worthless — for now, pass through honoring the
>   provider's own spam/phishing flags; real heuristics arrive at P5), Gate 2
>   (rule matcher — fully functional today against a rules table that happens
>   to be empty), Gate 3 (duplicates — the exact-match UNIQUE constraint;
>   semantic dedup fills this slot at P6), a draft slot (empty until P2), then
>   Gate 4, triage. Each slot is a function behind a fixed interface; later
>   prompts replace implementations, never the path.
> - **One screen at `/triage`**: the oldest item with `status='new'`, its sender,
>   subject and body, and four buttons — Add to calendar · Add reminder · File ·
>   Drop. Keyboard: A R F D, and ⌘Z to undo. **Phone-first**: one full-screen
>   card at a time, the four dispositions as thumb-reach buttons, bottom nav —
>   most zeroing will happen on a couch, not at a desk. The keyboard is the
>   desktop accelerant, never the only path.
> - **I type the title and the date myself.** No model call anywhere in this
>   version. If the model never works you still have a working system.
> - **Adapters** for Google Calendar and Google Tasks, write-through, each push
>   recording an idempotency key.
> - **One connection**, scoped to **the last 7 days of one Gmail label**. Set
>   `wizard_completed_at` manually for it so I-2 is satisfied; the real wizard
>   is P4. Also create my `manual` pseudo-connection and the "+ Add" form —
>   paper mail and 2am ideas need a door too (T-27, T-37).
> - The card lets me type a `repeat` (plain choices: daily, weekly, monthly on
>   day N, every N days, yearly) — the provider executes it. Half of household
>   administration is recurring (T-02, T-08, T-13, T-18); a version that
>   cannot say "every month on the 5th" fails the dog.
>
> Create `package.json` with exactly these scripts and commit `package-lock.json`:
>
> ```
> "check:types": "tsc --noEmit"
> "check:lint":  "eslint . --max-warnings 0"
> "test:unit":   "vitest run"
> "test:e2e":    "playwright test"
> "build":       "vite build"
> "start":       "node server/index.js"
> "ci":          "npm run check:types && npm run check:lint && npm run test:unit && npm run build && npm run test:e2e"
> ```
>
> The workflows call those seven names. Renaming any of them breaks the
> pipeline. Do not add others to `ci`.
>
> **The adapter contract, from `docs/OPERATIONS-SCARS.md` — build it into the
> base adapter class, not into each adapter:** four-way error classification
> (429 transient w/ Retry-After · 401/403 fatal-surface · 5xx transient ·
> other 4xx api-changed), per-record 404-in-the-race = terminal disposition
> never source backoff (S2/S3), durable per-connection cursor, dedup by
> `INSERT OR IGNORE` where **the conflict loser treats the outcome as
> success** (S4), `last_sync_stats` written every run (S7), and provider time
> never substituted with now() — missing time quarantines (S6). First sync
> starts only after `/healthz` is listening (S12). Day boundaries are computed
> in the household IANA timezone as half-open UTC windows (S14).
>
> Also ship: **`npm run doctor`** (S17 — named checks incl. the false-zero
> guard and one synthetic round trip), **`scripts/backup.sh`** using the
> SQLite backup API (S16 — never `cp` a live WAL db), and **`PUSH_MODE`**
> (S18 — `record` writes would-have-pushed rows, touches no provider; the
> insurance every new connection's first zeroing runs under).
>
> Playwright must start the server against a temporary SQLite file, load
> `/triage`, press `A`, and assert the item left the queue and a row landed in
> `pushes`. Take a screenshot on every test — CI uploads them as the only visual
> review this project has.
>
> Set `stage = "scaffolded"` in `harness.toml`. Report which invariant tests pass
> and which are still red, honestly.

**Done when:** `npm run ci` green · I-1 to I-7 and I-9 pass, I-8 pending · you
can click a real email onto your real calendar · **and the spine is finished:**
state in the PR body that every remaining prompt only fills a gate slot, adds
an adapter, or paints a screen. P1 is the last time the spine is edited — if a
later prompt turns out to need a spine change, that is a design error to
surface, not to implement.

---

## P2 — The model call

> Add the single extraction call from `docs/ARCHITECTURE.md`. One call per
> item, an **array of one to five objects** back, validated against the
> contract before it is stored in `items.proposal_json`. One email routinely
> carries several obligations — a group email with three tasks (T-01), an
> invitation with an RSVP deadline and an event date (T-29). The card shows
> sub-proposals; disposing writes child items with `parent_item_id`, each with
> its own decision row, and the parent's decision records `action = 'split'`.
>
> The triage card pre-fills from it: kind, title, when, list, the one-line
> `why`, and — directly under the proposal — the **verbatim `evidence` quote**.
> Validation rejects an `evidence` string that does not appear in the source
> body: a quote is checkable in one glance, a paraphrase is not. Everything
> stays editable — press `E`.
>
> The runtime key lives in `.env` on the mini, gitignored and never committed.
> `**/.env*` is a blocked path — this is a machine secret, and the Actions
> secrets from Step 0 belong to the pipeline, not to this call.
>
> **I-3 is the one to get right.** If the source has no time, `when` is null and
> `kind` may not be `calendar`. Test it with a message that says "next week"
> and one that says "Thursday at 4" — the first must not produce a date. The
> same rule covers `repeat`: "every month on the 5th" in the source may propose
> a recurrence; nothing else may.
>
> **The extraction fixtures corpus — the guard architecture cannot provide.**
> An extraction regression corrupts no table and fails no invariant: the spine
> stays green while proposals quietly get worse. So: `tests/extraction/` holds
> (source message → expected proposal) fixtures, run in `ci`, and **it only
> grows** — every proposal I correct in triage is exportable as a new fixture
> (the pair already exists in `proposal_json` + `decisions`; add a one-tap
> "save as fixture" on the correction). No change to extraction or gate code
> merges if a fixture regresses.
>
> If the call fails or returns anything off-contract, the item goes to triage
> undrafted. That is the floor: no worse than P1. Retries use fresh
> idempotency identities (`<id>:retry-1`, `:retry-2`), bounded at two, 60 s
> timeout — reusing the base identity replays the recorded failure forever
> (S5).

**Done when:** cards pre-fill · a timeless message never becomes a calendar
entry · a model failure degrades to manual instead of blocking the queue.

---

## P3 — Rules, and the learning loop

> This is the product. Read `docs/COLD-START.md` in full first.
>
> - **The checkbox.** Every disposition offers "always do this for …" in the
>   same gesture. Scope starts narrow — sender-exact, then sender + subject
>   pattern — and is widenable. If making a rule costs more than one click,
>   no rule will ever be made. V2 proves it: 462 candidates, 0 rules.
> - **Preview before activation.** Show the forward count against the current
>   queue, the historical count, and a browsable list. A rule that cannot show
>   what it catches is a rule you cannot audit later.
> - **Retroactive sweep.** Activating disposes every matching item in the queue
>   as one recorded, reversible batch. Without this a rule only helps with
>   future items and the backlog still has to be cleared by hand.
> - **Gate 2.** Fill the slot P1 wired — do not touch the intake path itself.
>   A matching item never reaches triage; it is disposed with
>   `decided_by = "rule:<id>"` and is undoable (I-5).
> - **Grouping in triage.** Several waiting items from one sender are offered
>   together: one decision, six items.
> - **The Rules screen.** Every rule with its hit count, when it last fired, and
>   a switch. Switching one off brings its items back.
> - **Counters.** Queue depth *with its slope*, rules active, and percent of
>   recurring senders classified. Never show a depth without a slope.

**Done when:** disposing proposes a scoped rule · preview shows its list before
activating · activation visibly drops the counter · a rule-disposed item never
reaches triage · switching a rule off returns its items.

---

## P4 — The New Connection Wizard

> Six steps, per `docs/PRESENTATION.html` §5. **Reuse P3's grouping component**
> pointed at history rather than at the queue — do not write a second one (I-6).
>
> 1. Connect — OAuth, read-only.
> 2. Scope — mailbox, labels, folders. For iMessage and WhatsApp: which
>    conversations, group chats off by default.
> 3. **Meet your senders** — scan history, cluster by sender, rank by volume,
>    show a running coverage figure. One row per sender, the same four buttons.
>    Describe each sender by **behaviour, not content**: how many messages,
>    whether you ever replied, whether you ever opened it. Never "this looks
>    unimportant" — a model's opinion about importance is not checkable by me in
>    a glance, and behavioural facts are.
> 4. Defaults — anyone not decided about goes to triage. The unknown is never
>    auto-disposed.
> 5. History — start from today, or sweep the backlog with the rules just made.
> 6. Summary — "N rules · covers about X% · the rest goes to triage."
>
> Set `wizard_completed_at` and `policy_coverage_pct` on the connection when it
> finishes. Until then that connection produces nothing (I-2).

**Done when:** running the wizard on a real mailbox produces rules covering a
majority of its volume before a single item hits the queue.

---

## P5 — Connect everything, one at a time

> No new code unless something breaks. This prompt is a procedure.
>
> Connect in this order, and **do not start the next until the previous one's
> queue has been zeroed once**:
>
> 0. Before connecting: fill P1's Gate 1 slot with real heuristics —
>    provider spam verdicts, first-time-sender links+urgency+payment patterns
>    → quarantine, never a candidate, contacts never surfaced (T-38: V2
>    turned one phishing mail into four tasks and displayed the attacker's
>    number). Full volume arrives next; the threat gate goes live first.
> 1. My Gmail — full scope now, wizard first. Bootstrap per S1: snapshot
>    `historyId` as the incremental floor FIRST, then bounded backfill
>    (default 730 days / 1,000 messages), oldest-first per thread; the window
>    is a recorded decision. First zeroing session runs `PUSH_MODE=record`
>    (S18), then flip live
> 2. My Outlook
> 3. iMessage — the bridge runs on **my Mac**, under my Apple ID and TCC
>    grants, per `docs/TOPOLOGY.md`; the mini never reads `chat.db`. Bridge
>    checklist: modern macOS stores text in `attributedBody` typedstream
>    blobs, not the `text` column; tapbacks are separate rows that must never
>    become items ("Loved 'dinner at 7'" is not a commitment); edits/unsends
>    arrive as revisions → supersede (G4); a denied TCC prompt yields empty
>    reads, not errors (S10)
> 4. WhatsApp — same placement; if OpenClaw's channel plumbing is reused it is
>    wrapped as that bridge, behind the same POST contract (TOPOLOGY §OpenClaw)
> 5. Laura's connections, hers alone (I-7) — her bridge on **her** Mac; her
>    tailnet identity is what lets it write only into her connections
>
> One at a time is not caution, it is diagnosis: connect four at once and you
> cannot tell which one is generating the noise. iMessage and WhatsApp go last,
> after the person-to-person bar has been proven against real transactional
> volume.
>
> After each: report policy coverage, queue depth, and the largest remaining
> group by sender.
>
> Set `stage = "operating"` in `harness.toml` once the first connection is fully
> zeroed. That is what opens Phase 2.

**Done when:** every inbox is connected · each was zeroed before the next ·
`stage = "operating"` · labelling an issue `build` runs the pipeline.

---

## P6 — Plaid, Notes, Today

> **Plaid.** Transactions read-only. Use `/transactions/recurring` before
> building detection by hand; handle `ITEM_LOGIN_REQUIRED` (banks force
> re-link ~90 days) as a surfaced fatal, not a retry loop (S3). Detect recurring merchants and propose
> **patterns, never transactions** — minimum three occurrences with a
> recognisable cadence (I-8). One card per detected pattern: the merchant, the
> cadence you inferred, the three-plus dates it is inferred from, and one button
> that creates a recurring reminder. Never a card per transaction — get that
> wrong and you have built a second inbox with 400 items in it.
>
> **Notes.** One store first — whichever I actually use. Same bar as messages:
> a commitment needs a thing to do and usually a when. "Thinking about the
> Panama question" is not a task; "call the tax attorney before the 15th" is.
>
> **Reconcile-lite.** Today already reads the providers, so make the read do
> double duty: diff it against `pushes`. A push whose `provider_id` no longer
> resolves, or was never observed in a read, shows an **unverified** badge —
> the API said 202 once, and 202 is transport, not truth. No sync engine, no
> outbox: one diff over data both sides already have.
>
> **Chore recurrence advances from completion, not from the calendar.** "HVAC
> filter every 90 days" means 90 days after you *did* it. Push those with the
> provider's repeat-after-completion mode (Apple Reminders has it natively;
> Google Tasks does not — prefer Reminders for chores). Fixed-date recurrences
> (the 5th, first Thursday) stay plain RRULEs.
>
> **Today.** A read-only mirror of what already exists in the providers — and
> match what the live V2 page proves useful: **all visible calendars** (mine,
> Laura's busy/free, shared family calendars), not just the push target; the
> reminders lists with same-title provider copies grouped read-only ("3 copies
> · review"); a per-connection freshness line ("latest source 12:39 · 68
> records"); and a link to triage showing **depth + slope**, never the queue
> itself. It never holds the only copy of anything. "Today" is computed in
> the household timezone (S14). Google-backed calendars are owned by the
> Google adapter ONLY — reading them again via EventKit doubles every event
> (S15). Reminders sync carries symmetric never-sync exclusions, in and out
> (S15).
>
> Also: fill P1's Gate 3 slot with semantic duplicate detection across
> connections — the same thing arriving in two
> inboxes auto-disposes the second as `duplicate_of` the first (I-1, Gate 3,
> T-39). A Plaid pattern matching an existing rule's items dedups the same way
> (T-13).

**Done when:** a recurring spend produces one proposal, not many · notes produce
commitments and not prose · Today matches what is actually in your calendar.

---

## P7 — Reply debt, supersede, and order

> Three closures from `docs/TEST-REPERTOIRE.md`. No new tables.
>
> - **Reply debt** (T-11, T-32). For connections with `sent_scope = 1` — the
>   wizard asks — detect: addressed to me, asks something, and **no reply of
>   mine exists in the thread after N hours** (default 36). That produces a
>   candidate "Reply to <person>" with a deep link (`url`) back to the thread.
>   Detection is purely behavioural — the presence or absence of my reply —
>   never a model's judgment of what deserves one. Disposing is normal: Remind
>   puts it on a list, Drop writes a rule ("never chase this sender").
> - **Supersede and cancel** (T-12, T-34, T-36). A new arrival in the same
>   thread as an item that has pushes links via `supersedes_item_id`. The card
>   pre-fills as an **update to the existing push** (reschedule) or an **undo**
>   (cancellation) — never a second calendar entry, never silently swallowed
>   as a duplicate. Undo appends a decision (I-4) and sets `undone_at`.
> - **Triage order, exactly as ARCHITECTURE states it** (T-04, T-11, T-03):
>   rule-floated senders → unanswered p2p asks by age → oldest first → lapsed
>   grouped at the bottom with one-tap File/Drop. Plain code; a test asserts
>   the order for a fixed fixture queue.

**Done when:** an unanswered ask surfaces by itself after 36 h · a reschedule
email updates the calendar entry instead of doubling it · a cancellation offers
undo · the fixture queue sorts exactly as specified.

---

## After P7 — Phase 2

You never paste a scaffold prompt again. (Waiting-for — things *others* owe
*you*, T-33 — is the reply-debt scan inverted; file it as the first Phase 2
issue when it starts to itch. It needs no migration.) Say what you want in chat, the agent
files an issue, and the pipeline builds, checks, reviews, repairs, gates, merges
and releases it. Screenshots land on the checks run; you pull to the mini when
you want it.

**Retire the build docs.** The Phase 2 loop reads three files
(`harness.toml`, `AGENTS.md`, one playbook); everything that only mattered
while building now costs context. In one PR:
`git mv docs/PRESENTATION.html docs/HARNESS-ARCHITECTURE.html docs/PLATFORM-ARCHITECTURE.html docs/V2-PARITY.md docs/archive/`
and `git mv CONFLICTS-RESOLVED.md docs/archive/` (update the two links in
ARCHITECTURE.md). The self-check accepts either location; the growth gate
counts `docs/archive/` as free. ARCHITECTURE, SCHEMA, COLD-START, TOPOLOGY,
OPERATIONS-SCARS and TEST-REPERTOIRE stay live — they are operating manuals,
not history.

**The two numbers to watch weekly:** policy coverage should climb then flatten
high; decisions per week should fall while volume holds or rises. If coverage is
flat and decisions aren't falling, the learning loop is broken and nothing else
matters until it isn't.
