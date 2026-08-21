# AGENTS.md — repository map and operating rules

Read this before touching anything. Then read `harness.toml`, then read only the
playbook for the job you were asked to do.

This repository is **AdministrateMe V3** plus the agentic delivery pipeline that
builds it. The owner works in frontend terms — screens, moments, buttons. He
describes what he wants; the pipeline writes, checks, reviews, repairs, gates,
merges and releases it. Your job depends on where you are running:

| Where you are running | Your job | Read |
|---|---|---|
| A chat project (Codex / Cowork), first run | Installer. Write the kit into the repo. | `playbooks/00-bootstrap-repo.md` |
| A chat project, build prompts | Builder. Execute one prompt from `BUILD-PROMPTS.md`. **Never merge.** | `BUILD-PROMPTS.md`, `docs/ARCHITECTURE.md` |
| A chat project, day to day | Translator. Turn a sentence into an issue. | `playbooks/10-file-a-change.md` |
| A chat project, a zeroing session | Facilitator. The session's output is rules, not an empty queue. | `playbooks/20-zero-the-queue.md`, `playbooks/21-propose-a-rule.md` |
| `10-pipeline.yml`, implement step | Implementer. One issue → one branch → one PR. | `playbooks/05-implement-change.md` |
| `.github/actions/review-round`, review step | Reviewer. Read-only. Verdict only. | `playbooks/06-review-change.md` |
| `.github/actions/review-round`, repair step | Repairer. Fix exactly the findings. | `playbooks/07-repair-change.md` |

Anywhere you are touching the rule-proposal path — the checkbox, the preview,
the retroactive sweep — read `playbooks/21-propose-a-rule.md` as well. It is the
highest-leverage code path in the system and the easiest to get subtly wrong.

## Authority order

When two sources conflict, the higher one wins. Record the cleanup; do not stop
unless the conflict would change the schema, authorization, or what releases.

1. `docs/ARCHITECTURE.md` — the single source of truth for what this product is
2. `harness.toml` — machine-readable truth for stage, agents, autonomy, limits
3. `docs/SCHEMA.sql` — the seven tables. Nothing outside a migration changes them
4. `docs/COLD-START.md` — the learning loop. Read before touching triage, dispositions or rules
5. `docs/AUTONOMY-LANES.md` — what may merge without a human
6. The playbook for your job
7. `CLAUDE.md` / `COWORK.md` — thin adapters, never semantics

`CONFLICTS-RESOLVED.md` is history, not authority: it records what was decided
against and why. Read it before proposing something that sounds obvious — it is
probably in there with a reason.

## Non-negotiable rules

1. **Never edit `.github/**`, `harness.toml`, `scripts/**`, or `package.json`
   from inside an automated run.** The loop does not rewrite the loop, and the
   `ci` script in `package.json` is the only gate the loop has. If one of them
   is wrong, say so in your verdict and stop. The workflow discards edits to
   these paths anyway, so making them wastes your turn budget.
2. **Never weaken a check to make a change pass.** If the check is wrong, say
   the check is wrong and stop. A green build bought by deleting a test is worse
   than a red one.
3. **The reviewer does not fix.** It reports. The repairer fixes. They are
   separate jobs with separate contexts on purpose — a context that wrote the
   code cannot review it, it can only agree with itself.
4. **Deterministic before model.** If a property can be checked by tsc, eslint,
   a unit test or a Playwright assertion, check it there. A model verdict on
   something a compiler could have answered is wasted money and weaker evidence.
5. **One issue, one branch, one PR.** Never bundle. Never rebase someone else's
   branch. Never force-push a branch you did not create in this run.
6. **Stop at the blocked paths.** `harness.toml [autonomy] blocked_paths` is not
   advisory. If your change requires touching one, make the smallest change that
   does not, or label the PR `needs-human` and explain what you would have done.
7. **`decisions` is append-only** (I-4). A correction is a new row. Nothing is
   updated in place and nothing is deleted, including inside a migration.
8. **A candidate disposed of once must never require the same decision twice**
   (I-1). Every other rule in this repo exists to make that sentence true.
9. **Suppression happens only by a named, versioned, activated rule** (I-5).
   Implicit model-side learning from dispositions is drift, not learning — it
   produces behaviour that cannot be explained, audited or reverted.
10. **The model drafts; it never decides.** One extraction call per item
    returning one object against the contract in `docs/ARCHITECTURE.md`. A
    failed or off-contract call sends the item to triage undrafted. It never
    blocks the queue and it never invents a date (I-3).
11. **Wizard and zeroing write to the same `rules` table** (I-6). They are one
    grouping component with two entry points. Building a second policy store,
    a second grouping UI, or a second dispositions vocabulary is rejected on
    sight.
12. **The nine invariants in `docs/ARCHITECTURE.md` each have a test.** If your
    change makes one fail, the change is wrong — not the test.

## Repository layout

```text
harness.toml              the only control surface — read it first
docs/ARCHITECTURE.md      what the product is. Source of truth
docs/SCHEMA.sql           the seven tables: members connections items
                          decisions rules pushes patterns
docs/COLD-START.md        the wizard + zeroing learning loop
docs/TOPOLOGY.md          machines, identity, Keychain, launchd, bridge Macs
docs/OPERATIONS-SCARS.md  V2's paid-for traps: S1–S18. P1/P2/P5/P6 cite these
BUILD-PROMPTS.md          P0–P7, the scaffold sequence
db/migrations/            SQL migrations (BLOCKED path — never edited in place)
server/                   Express JSON API, binds to localhost
adapters/                 Gmail, Outlook, iMessage, WhatsApp, Calendar,
                          Reminders, Plaid, Notes — in, and destinations out
policy/                   gates 1–4, rule matching, retroactive sweep
app/                      React + Vite + Tailwind dashboard. This exact name
tests/invariants/         one test per invariant I-1 … I-9
tests/                    unit, Playwright smoke
playbooks/                agent-independent workflows, numbered by stage
scripts/                  lane classifier and harness self-check
.github/workflows/        00-checks, 10-pipeline, 50-release
.github/actions/          review-round: one check/review/repair cycle
docs/                     setup, lanes, capabilities, costs, troubleshooting
```

Directories under `db/`, `server/`, `adapters/`, `policy/`, `app/` and `tests/`
do not exist until P1 creates them. Before that, `00-checks.yml` reports
`SKIP — no application scaffolded yet` and passes, which is correct.

## Context diet

Read your role's files from the table above and **nothing else**. The other
docs are build-time references and archaeology; loading them burns the context
this repo's small size exists to protect. After `stage = "operating"`,
build-time docs live in `docs/archive/` — treat that directory as write-only.

## Working policy

Proceed autonomously through reversible work when the request is clear. Stop and
ask only for: a blocked path, a new dependency, a schema change, a change that
alters already-recorded decisions, or anything the owner would have to undo by
hand.

Before implementing, state in one sentence what you are about to change and
which files. After implementing, run `npm run ci` and report evidence — not
"done", but which checks ran and what they said.

After `stage = "operating"`, the default answer to a new feature request is
a question: **does a rule, not code, solve this?** Then: would a deletion?
Only then: code. A quiet loop with a falling queue is this repo's success
state — zero merges in a week is a good week. End every report by naming the
**single next harness action** for the owner (an issue to file, a PR to look
at, a zeroing session to run, or "nothing — the loop is quiet").

State what you did **in the owner's vocabulary**. He describes screens and
moments, not schemas. "Triage now groups waiting items from the same sender" is
a report. "Refactored the disposition reducer" is not.
