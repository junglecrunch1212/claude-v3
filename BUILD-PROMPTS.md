# Build prompts

Seven prompts: P0 installs the harness, P1–P6 build the product. Each is one
agent run in a chat project connected to your repo.
Together they produce the runtime infrastructure and the dashboard, and leave
the repo in a state where **Phase 2 — the issue → build → review → release loop
— works.**

Read `docs/ARCHITECTURE.md` first. It is the source of truth these prompts are
generated from; if a prompt and it ever disagree, it wins.

```
  P0  install the harness           ~5 min   no app code
  P1  the machine, tiny scope       ~30 min  no AI
  P2  the model call                ~20 min
  P3  rules — the learning loop     ~30 min  ← this is the product
  P4  the New Connection Wizard     ~30 min  ← unlocks connecting for real
  P5  connect everything            ~20 min + one zeroing session each
  P6  Plaid, Notes, Today           ~30 min
  ──────────────────────────────────────────
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
> - **`db/`** — SQLite via better-sqlite3, schema exactly as `docs/SCHEMA.sql`.
>   `db/migrations/001_init.sql` is that file. Migrations are a blocked path;
>   never edit one after it ships, add a new one.
> - **`server/`** — Express. JSON API for the queue and the dispositions.
>   Sessions are not needed; this binds to localhost and is reached over
>   Tailscale.
> - **`app/`** — React + Vite + Tailwind. **The directory must be called exactly
>   `app`** — it is `[stack] app_dir` in `harness.toml`, which CI's app-exists
>   probe reads. Scaffold somewhere else and every check reports SKIP and passes
>   while testing nothing.
>
> These four names are pinned too, because the lane classifier, the docs and the
> troubleshooting page all reference them: **`tests/e2e/`** (Playwright),
> **`tests/invariants/`**, **`adapters/`**, **`policy/`**. Use exactly those.
> - **A member switch, and every query scoped by it.** No login, no sessions —
>   just a member selector whose id scopes every read. I-7 is enforced in the
>   query layer, not by authentication: this box sits on a tailnet and anyone
>   who can reach it can open the dashboard. What must be impossible is Laura's
>   items appearing in my queue, and that is a `WHERE member_id = ?` you can
>   write a test against.
> - **One screen at `/triage`**: the oldest item with `status='new'`, its sender,
>   subject and body, and four buttons — Add to calendar · Add reminder · File ·
>   Drop. Keyboard: A R F D, and ⌘Z to undo the last decision.
> - **I type the title and the date myself.** No model call anywhere in this
>   version. If the model never works you still have a working system.
> - **Adapters** for Google Calendar and Google Tasks, write-through, each push
>   recording an idempotency key.
> - **One connection**, scoped to **the last 7 days of one Gmail label**. Set
>   `wizard_completed_at` manually for it so I-2 is satisfied; the real wizard
>   is P4.
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
> Playwright must start the server against a temporary SQLite file, load
> `/triage`, press `A`, and assert the item left the queue and a row landed in
> `pushes`. Take a screenshot on every test — CI uploads them as the only visual
> review this project has.
>
> Set `stage = "scaffolded"` in `harness.toml`. Report which invariant tests pass
> and which are still red, honestly.

**Done when:** `npm run ci` green · I-1 to I-7 and I-9 pass, I-8 pending · you
can click a real email onto your real calendar.

---

## P2 — The model call

> Add the single extraction call from `docs/ARCHITECTURE.md`. One call per item,
> one JSON object back, validated against the contract before it is stored in
> `items.proposal_json`.
>
> The triage card pre-fills from it: kind, title, when, list, and the one-line
> `why`. Everything stays editable — press `E`.
>
> The runtime key lives in `.env` on the mini, gitignored and never committed.
> `**/.env*` is a blocked path — this is a machine secret, and the Actions
> secrets from Step 0 belong to the pipeline, not to this call.
>
> **I-3 is the one to get right.** If the source has no time, `when` is null and
> `kind` may not be `calendar`. Test it with a message that says "next week"
> and one that says "Thursday at 4" — the first must not produce a date.
>
> If the call fails or returns anything off-contract, the item goes to triage
> undrafted. That is the floor: no worse than P1.

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
> - **Gate 2.** Rules apply at intake. A matching item never reaches triage;
>   it is disposed with `decided_by = "rule:<id>"` and is undoable (I-5).
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
> 1. My Gmail — full scope now, wizard first
> 2. My Outlook
> 3. iMessage
> 4. WhatsApp
> 5. Laura's connections, hers alone (I-7)
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

> **Plaid.** Transactions read-only. Detect recurring merchants and propose
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
> **Today.** A read-only mirror of what is already in the calendar and the
> lists. It never holds the only copy of anything.
>
> Also: duplicate detection across connections — the same thing arriving in two
> inboxes is one item with two sources (I-1, Gate 3).

**Done when:** a recurring spend produces one proposal, not many · notes produce
commitments and not prose · Today matches what is actually in your calendar.

---

## After P6 — Phase 2

You never paste a scaffold prompt again. Say what you want in chat, the agent
files an issue, and the pipeline builds, checks, reviews, repairs, gates, merges
and releases it. Screenshots land on the checks run; you pull to the mini when
you want it.

**The two numbers to watch weekly:** policy coverage should climb then flatten
high; decisions per week should fall while volume holds or rises. If coverage is
flat and decisions aren't falling, the learning loop is broken and nothing else
matters until it isn't.
