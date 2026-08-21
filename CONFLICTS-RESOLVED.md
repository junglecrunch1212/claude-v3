# Cross-reference audit — what conflicted and how it was resolved

Everything produced across this project was checked against everything else.
Twelve conflicts, four of them serious enough that deploying the previous kit
and running its prompts would have built the wrong system.

**The governing rule used to resolve all of them:** where documents disagree,
the later correction wins. The design moved twice — away from an event-sourced
platform toward a small tool, and away from a forwarding inbox toward federated
connections with policy. Anything still carrying the earlier design was wrong.

---

## Serious — would have produced the wrong system

### C1 · The prompt sequence built the thing we decided not to build

`PROMPT-SEQUENCE.md` in the previous kit generated an event-sourced kernel, 11
refusals, a context engine, a knowledge graph, a confidence ladder, source
accounting and ten routes. The final design is seven tables, four buttons and four
screens, explicitly without any of those.

Deploying that kit and running its prompts would have rebuilt V2's complexity
with none of V2's working surfaces.

**Resolved:** prompt sequence rewritten from scratch as `BUILD-PROMPTS.md`,
generated from the final architecture rather than the earlier one.

### C2 · Workflows called npm scripts that no longer exist

`00-checks.yml` and `50-deploy.yml` called `npm run build:projections` and
`npm run check:determinism`. Both belong to the event-sourced kernel. In the
current design there are no projections to build and no kernel to scan.

Every CI run would have failed on a missing script, and because the pipeline
forces a `fail` verdict when checks are red, **nothing would ever have merged.**

**Resolved:** both removed. The script contract is now exactly seven names, and
`BUILD-PROMPTS.md` P1 creates precisely those:

```
check:types · check:lint · test:unit · test:e2e · build · start · ci
```

### C3 · GitHub Pages cannot host this app

The harness deployed a static build to Pages. The runtime is a Node server with
a local SQLite file on the Mac mini. Pages serves static files and runs no
server code, so the deploy step could never have worked — and if it somehow had,
it would have published your household's data to the public internet.

**Resolved:** Pages deploy deleted. `50-deploy.yml` → `50-release.yml`, which
builds, proves the build, and cuts a release with its evidence attached. The
mini pulls when you want it.

**What replaced the preview:** Playwright screenshots upload as an artifact on
*every* checks run, not just failures. That is how you look at a UI change
before pulling it.

### C4 · The forwarding inbox survived in three documents

An earlier answer proposed a shared forwarding address. That was wrong —
forwarding depends on remembering to capture, which is the failure being fixed —
and V3 connects a member's inboxes directly.

**Resolved:** every reference purged. `docs/ARCHITECTURE.md` is now the single
source of truth for how capture works.

---

## Real, smaller

### C5 · Three different refusal-numbering schemes

`model-additions.toml` had R-007–R-013, `SPEC.md` had R-014–R-023,
`model.seed.toml` had R-101–R-111. Overlapping ids meaning different things.

**Resolved:** one list of **nine invariants** in `docs/ARCHITECTURE.md`, numbered
I-1 to I-9, each with a test named in `BUILD-PROMPTS.md` P1. The TOML refusal
lists are gone — they described a kernel that no longer exists.

### C6 · Blocked paths referenced files that will never exist

The previous kit blocked `seed/**`, `gates/**`, `rules.toml`,
`kernel/confidence.ts`, `domain/refusals.toml`. None of those are files in this
design — `rules` is a database table, not a file on disk.

**Resolved:** blocked list cut to what actually exists and actually matters:
migrations, `.github/**`, `harness.toml`, `scripts/**`, manifests, and
secret-shaped filenames. `kernel/auth/**` is kept as a forward declaration so
that if auth is ever added it is born blocked.

### C7 · Autonomy mode contradicted itself

Kit said `narrow`; the presentation said `wide`. Worse, `narrow` in
`lane-classify.mjs` only opens `app/**`, `*.tsx`, `*.css`, `tests/e2e/**` and
`docs/**` — which would have blocked the server, the database layer and the
adapters. Almost every PR would have stopped for a human.

**Resolved:** `wide`. It is a household tool, and the blocked list already
protects the parts that matter.

### C8 · Repair rounds vs the self-check

The presentation said one review and one repair round; the pipeline wires two.
The self-check requires `max_repair_attempts` ≤ wired rounds.

**Resolved:** `max_repair_attempts = 1`. Round 2 is skipped by its own
condition, the verdict-only round still runs, and the self-check passes. Raising
it later is a config change, not a YAML change.

### C9 · The app-directory probe was unpinned

CI decides "is there an app yet" by looking for `package.json`,
`package-lock.json` and a directory called exactly `app`. If P1 had scaffolded
into `src/` or `web/`, every check would have reported `SKIP — no application
scaffolded yet` **and passed**. A permanently green pipeline testing nothing.

**Resolved:** `app_dir = "app"` is now declared in `harness.toml` and pinned in
P1's prompt text.

### C10 · Stage gate vs the prompt sequence

The pipeline refuses to run unless `stage` is `scaffolded` or `operating`, but
no prompt reliably set it.

**Resolved:** P1 sets `scaffolded`, **P5** sets `operating` — once the first
connection has been zeroed — and both are in the done-when lists.
`10-pipeline.yml` accepts `operating` only.

### C11 · Two policy-writing paths, one table

The wizard and zeroing both write rules. Nothing said they share a table. Two
tables would silently drift apart.

**Resolved:** one `rules` table with an `origin` column. Stated in
`docs/SCHEMA.sql` and enforced by invariant I-6.

### C12 · Observation mode was specified for a system that has no unattended writes

Carried over from V2, where a machine acts on your behalf. Here you press the
button — until rules act at Gate 2, which is week 3.

**Resolved:** dropped as a separate mode. Its actual job is done by two things
that already exist: rules are switchable, and every auto-disposal is logged and
undoable. Invariant I-5.

---

## Second pass — defects found by cross-referencing the finished kit

An adversarial read of all 36 files against each other, after the twelve above
were resolved. Two would have stopped the first run outright.

### C13 · You cannot branch from the default branch of a truly empty repo — BLOCKER

`START-HERE.md` insists on a repo with zero commits; `00-bootstrap-repo.md` then
said "create `harness-bootstrap` from the default branch." There is no default
branch and no base sha. Working around it by pushing the branch directly makes
*it* the default, so `main` never exists — which breaks `--base main`, the
`origin/main...HEAD` diff the lane classifier reads, and the `branches: [main]`
triggers on two workflows.

**Resolved:** a new step 2 commits the kit's `.gitignore` to `main` first, with
the four downstream breakages named so nobody optimises it away.

### C14 · Nothing created the `build` label, and it is the only trigger — BLOCKER

`10-pipeline.yml` creates `build`, `harness` and `needs-human` — inside a run
that only starts when an issue is labelled `build`. Circular. The issue template
ships `labels: []`, and the bootstrap playbook explicitly forbade creating any.
The owner would open an issue, find no label to apply, and nothing would ever
run.

**Resolved:** label creation is step 6 of the bootstrap, with the circularity
spelled out. The prohibition now covers issues and milestones only.

### C15 · The stage gate opened one prompt too early

Five documents said the pipeline stays shut until `stage = "operating"`. The
workflow accepted `operating|scaffolded` — the value P1 sets. Its own refusal
message told the owner to finish P1–P5 while the code accepted P1.

**Resolved:** `operating` only. `scaffolded` means there is code but a partly
red invariant suite and no connection zeroed, which is exactly the repo an
issue-driven loop turns into confident nonsense.

### C16 · `app_dir` was declared in `harness.toml` and read by nothing

C9 claimed to have fixed the SKIP-forever defect by declaring `app_dir`. But
both probes hardcoded `[ -d app ]` and `harness-config.mjs` never emitted the
key — so editing "the only control surface" reproduced C9 exactly.

**Resolved:** `app_dir` is an emitted output, both probes read it, and each
workflow reads `harness.toml` before probing.

### C17 · `**/*.auth.ts` was documented as blocked in four places and wasn't

`AUTONOMY-LANES.md`, `START-HERE.md` and the harness diagram all quoted it as
config. It was not in `blocked_paths`. `selfcheck.mjs` unit-tested the *glob*
without asserting it was configured, so everything passed while
`app/session.auth.ts` classified as `open`.

**Resolved:** added to `blocked_paths` and to the self-check's `MUST_BLOCK`
probes, which are evaluated at the widest mode.

### C18 · The screenshots promised by five documents did not exist

`00-checks.yml` was the only uploader, and it does not fire on PRs opened with
`GITHUB_TOKEN` — the pipeline's own comment says so. For every auto-merged
change there were no screenshots anywhere, while the release comment told the
owner to go look at them.

**Resolved:** the pipeline uploads its own artifacts on `always()`, and the
release links to that run.

### C19 · Release notes did not carry the evidence they were for

Documented as carrying verdict, lane and check status. They carried a sha and a
lockfile hash, and the workflow was never passed the rest.

**Resolved:** `verdict`, `lane`, `check_status` and `run_url` are dispatch
inputs, printed in the notes.

### C20 · Every expected refusal was reported as an unexplained crash

The stage gate, the quota check and "nothing was written" each post their own
explanation and `exit 1`. That tripped the `if: failure()` handler, which
appended "the pipeline stopped with an error" and applied `needs-human` — on the
very first thing `SETUP-CHECKLIST.md` asks the owner to try.

**Resolved:** each writes `handled=true`; the failure handler is guarded on all
three.

### C21 · The cost page had four of six defaults wrong

`max_prs_per_day` 20 (is 30), `max_repair_attempts` 2 (is 1), `max_open_agent_prs`
3 (is 2), release timeout 10 (is 20), and "worst case six model calls" against
the diagram's correct four. This is the page the owner reads to predict a bill.

**Resolved:** rewritten from `harness.toml`, with the wired-vs-used distinction
made explicit. `TROUBLESHOOTING.md`'s "the cap is 2" went the same way, and
round 1 now honours `max_repair_attempts = 0` instead of ignoring it.

### C22 · Rules could not store the scope every document told you to widen to

`COLD-START.md` and the zeroing playbook both say "widen to domain after a week."
`rules` had `match_sender` and `match_subject_contains` and nothing else, so
widening needed a migration — a blocked path, scheduled by no prompt, against a
`001_init.sql` P1 was about to freeze.

**Resolved:** `match_sender_domain` ships in `docs/SCHEMA.sql` now. The
rule-proposal playbook lists exactly the three matchers that exist and says to
stop rather than invent a fourth.

### C23 · I-7 had a test and no mechanism

"A member may not read another member's items" — on a single-`/triage` app with
no member context, on a box any tailnet device can open.

**Resolved:** P1 builds a member switch that scopes every query. Not
authentication — auth stays a blocked forward declaration — just
`WHERE member_id = ?`, which is the part you can write a test against.

### C24 · Leftover vocabulary that would have produced a fifth disposition

`R-102`/`R-103` cited in a playbook after C5 abolished refusal numbering;
`confirm`/`deny`/`defer` in two playbooks against an `Add · Remind · File · Drop`
schema; an "Ask" button in the wizard wireframe that `decisions.action` cannot
store; `interviewed` still in the self-check's stage ladder; CODEOWNERS still
protecting `/domain/events.schema.ts` and `/seed/`; the issue template shipping
another product's placeholders.

**Resolved:** all swept. Also fixed: multi-line `gh --body` strings that
rendered as code blocks because they kept their YAML indentation, and a
`[ -n "$X" ] && echo` in the release notes that would have aborted them
half-written under `set -e`.

---

## Failure modes checked and cleared

| Checked | Result |
|---|---|
| Every `npm run X` in a workflow has a matching script in P1 | ✅ seven names, exact |
| Every file `selfcheck.mjs` requires exists | ✅ passes |
| All workflow YAML parses | ✅ 6 files |
| Blocked paths satisfy every self-check assertion | ✅ including case-insensitive secret names |
| A plain frontend change still auto-merges at `wide` | ✅ |
| `max_repair_attempts` ≤ wired repair rounds | ✅ 1 ≤ 2 |
| A verdict-only final round exists | ✅ |
| No document still references Pages deploy, forwarding, projections, or the kernel | ✅ swept |
| CI can go green without an app and say so honestly | ✅ reports SKIP, does not claim to have tested |
| `docs/SCHEMA.sql` executes against a real SQLite | ✅ 7 tables created clean |
| Every disposition named anywhere is one of the four in `decisions.action` | ✅ |
| Every invariant id cited anywhere resolves to I-1…I-9 | ✅ no R-nnn survivors |
| No `${{ }}` interpolation of user-controlled text inside a `run:` body | ✅ all via `env` |
| Every label the workflows apply is created before it is needed | ✅ bootstrap step 6 |

## Known limits, stated plainly

- **None of this has run against a live repository.** It is statically checked,
  its self-check passes, and its YAML parses. The first real run will find
  things — run your first change with `mode = "shadow"`.
- **`50-release.yml` creates a GitHub release on every push to `main`.** If that
  is too noisy once you are iterating quickly, gate it on a label.
- **The pinned `openai/codex-action` sha and its input names are unverified**,
  as is whether `claude-code-action` tolerates an empty `anthropic_api_key`
  when only `CLAUDE_CODE_OAUTH_TOKEN` is set. Both are worth one throwaway run
  before you file a real issue.
- **Playwright screenshots are the only visual review.** If a change is
  visual and subtle, pull it to the mini before merging.
