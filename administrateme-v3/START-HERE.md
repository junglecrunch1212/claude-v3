# START HERE

You have this kit and an empty GitHub repo. This page gets you from there to a
running AdministrateMe V3 on your Mac mini, and to a repo where you can say
"the triage card should show the sender's last three messages" in chat and have
it built, reviewed, repaired, merged and released without you deciding anything
else.

Read the whole page once. It is short. Then do Step 0.

Alongside this: **`docs/ARCHITECTURE.md` is the source of truth** — if anything
here disagrees with it, it wins. `BUILD-PROMPTS.md` is the scaffold sequence.
`docs/COLD-START.md` is the part the product actually turns on.
`CONFLICTS-RESOLVED.md` records what was decided against and why.

The rest, in the order you are likely to want them:

| | |
|---|---|
| `docs/SETUP-CHECKLIST.md` | Step 0 in more detail |
| `docs/PLATFORM-ARCHITECTURE.html` | the product as one picture |
| `docs/HARNESS-ARCHITECTURE.html` | the pipeline as one picture |
| `docs/PRESENTATION.html` | the full argument, with dashboard wireframes |
| `docs/SCHEMA.sql` | the seven tables |
| `docs/AUTONOMY-LANES.md` | what merges without you, and why |
| `docs/COST-CONTROLS.md` | every dial and what it costs |
| `docs/GITHUB-CAPABILITIES.md` | which GitHub features are in, out, and why |
| `docs/TROUBLESHOOTING.md` | when something behaves oddly |

---

## What this is

Two machines, and keeping them separate is the entire design.

**The chat agent** (Claude Cowork, or ChatGPT Codex) is your *builder and
translator*. It writes the scaffold when you paste a build prompt, and it turns
sentences into well-formed GitHub issues. It runs only while a chat turn runs.
It is not the autonomous part — when the turn ends, there is no it.

**GitHub Actions** is the *autonomous part*. Once a `build`-labelled issue
exists, Actions runs implement → check → review → repair → gate → merge →
release with no further input, and comments on the issue when it lands.

So "without me" means **without a decision from you**, not without a message
from you. You send one sentence. Everything after it is machinery.

```
  you, in chat            GitHub Actions (unattended)
  ─────────────           ────────────────────────────────────────────
  "group waiting items
   from the same sender"
        │
        └── agent files an issue ──► implement ──► npm run ci
                                          ▲          (types, lint, unit,
                                          │           build, Playwright)
                                       repair ◄──── model review
                                      (1 round)          │
                                                    pass │
                                                         ▼
                                                   lane classifier
                                                    │          │
                                          open lane │          │ blocked
                                                    ▼          ▼
                                              auto-merge   ping you
                                                    │
                                                    ▼
                                          release + screenshots
                                                    │
                                                    ▼
                                            you pull to the mini
```

There is **no cloud deploy**. The runtime is Node + SQLite on the Mac mini
behind Tailscale. Your household's data never leaves that machine. CI proves the
build and uploads Playwright screenshots — those screenshots are the visual
review this project gets.

---

## Step 0 — one-time setup, about ten minutes

`docs/SETUP-CHECKLIST.md` has the same list in more detail. Short version:

1. **Create the empty repo.** No README, no .gitignore, no licence. Truly empty.
   Private is fine — nothing here needs Pages, so the free plan is enough.
2. **Install the Claude GitHub App** on that repo: <https://github.com/apps/claude>
3. **Add one secret** — Settings → Secrets and variables → Actions:
   - `ANTHROPIC_API_KEY` from <https://console.anthropic.com>, **or**
   - `CLAUDE_CODE_OAUTH_TOKEN` to bill your Claude subscription instead
     (run `claude setup-token` locally to generate one)
   - Optional and worth it later: `OPENAI_API_KEY`, which lets you set
     `reviewer = "codex"` in `harness.toml` so a different model family reviews
4. **Add one variable** — same page, Variables tab: `HARNESS_ENABLED` = `true`.
   Setting it to `false` is the kill switch. Everything stops within seconds.
5. **Allow Actions to merge** — Settings → Actions → General → Workflow
   permissions → *Read and write*, and tick *Allow GitHub Actions to create and
   approve pull requests*.

Do **not** set branch protection yet. Add it after your first successful
release, once you know the check names.

---

## Step 1 — install the harness

Attach this kit to a new project in **Claude Cowork** or **ChatGPT Codex**,
connect the project to your empty repo, and paste **P0 from `BUILD-PROMPTS.md`**,
filling in the two angle-bracket fields.

That writes every file here onto a branch, runs `node scripts/selfcheck.mjs`,
and opens a PR. No application code yet. Merge it. That is the harness installed.

You will see `checks` pass reporting `SKIP — no application scaffolded yet`.
That is correct: there is nothing to check until P1.

---

## Step 2 — build the runtime, P1 through P6

Paste them one at a time from `BUILD-PROMPTS.md`. Read the PR. Merge before the
next one. Each assumes the previous floor holds.

```
  P1  the machine, tiny scope    ~30 min   no AI anywhere in it
  P2  the model call             ~20 min
  P3  rules — the learning loop  ~30 min   ← this is the product
  P4  the New Connection Wizard  ~30 min
  P5  connect everything         ~20 min + one zeroing session each
  P6  Plaid, Notes, Today        ~30 min
```

**P1 has no AI in it at all.** You type the title and the date yourself. If the
model half of this never works, you still have a working system — that is the
floor everything else is measured against.

**P3 is the one that matters.** Rules are why the queue converges. V2 is live
with 462 candidates and zero rules, and that is the whole reason V3 exists.
Read `docs/COLD-START.md` before P3, not after.

P5 sets `stage = "operating"` in `harness.toml`. Until then the pipeline refuses
to run, on purpose — an issue-driven loop against a repo with no invariant tests
is a machine for producing confident nonsense.

---

## Step 3 — the part you'll actually live in

Look at the dashboard on the mini. Come back to chat. Say what you want changed.

> The triage card should show how many other items are waiting from this sender.

The chat agent files an issue and applies the `build` label. Actions does the
rest. A few minutes later the issue gets a comment. Pull to the mini and look.

That is the loop. Everything else in this repo exists to keep it from going
wrong.

---

## What stops on its own and waits for you

`harness.toml` has `[autonomy] mode = "wide"` — most things merge themselves.
These never do, at any mode:

- **`db/migrations/**`** — the one thing you cannot revert
- **`.github/**`** — the loop must not rewrite the loop
- **`harness.toml`**, **`scripts/**`** — the control surface and the classifier
- **`package.json`** — it holds the `ci` script, which is the pipeline's only
  gate. An agent that can edit it can rewrite `"ci"` to `"true"` and every check
  passes forever, silently. Also, a new dependency is a supply-chain decision,
  not a styling one
- **`kernel/auth/**`**, `*.auth.ts` — reserved. If authorization is ever added,
  it is born blocked
- anything env-, secret- or credential-shaped, at any depth, in any casing

When the loop hits one it labels the PR `needs-human`, requests your review, and
stops. Nothing is lost — the branch is pushed, the code is written, the review
already ran. You click merge, or you don't.

---

## Four things worth knowing before you start

**Run your first pipeline PR in shadow mode.** Set `[autonomy] mode = "shadow"`
in `harness.toml`. The full loop runs and posts exactly what it would have
merged, and merges nothing. Flip it back to `"wide"` once you have watched it
behave. Costs five minutes, buys certainty.

**The two numbers to watch weekly** are policy coverage and decisions per week.
Coverage should climb then flatten high. Decisions should fall while volume
holds or rises. If coverage is flat and decisions aren't falling, the learning
loop is broken and nothing else in the product matters until it isn't.

**None of this has ever run against a live repository.** Three adversarial
review passes found 29 defects in these files before you got them, four of which
would have broken the first run outright. They are fixed. That is also the base
rate, and the first live run will find more.

**Two dials control your bill.** `[limits]` in `harness.toml`, and
`HARNESS_ENABLED=false` as the emergency stop. Every agent call has a turn cap,
every job has a hard timeout, repair stops after one round, and there is a
per-day PR ceiling. If something looks wrong, flip the variable and read
`docs/TROUBLESHOOTING.md`.
