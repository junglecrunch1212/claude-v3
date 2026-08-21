# Which GitHub capabilities are part of the loop

A determination, not a survey. Each capability is either **in the loop**,
**beside the loop**, or **out**, with the reason.

---

## In the loop — load-bearing

### GitHub Actions — the engine

Everything unattended runs here. This is the only reason the harness works at
all: your chat agent stops existing when the turn ends; Actions does not.

Non-obvious constraint that shapes the whole design: `anthropics/claude-code-action`
authenticates as a GitHub App, so **its commits re-trigger workflows**. That is
what would make a stage-per-workflow chain loop indefinitely, and it is why the
entire write → check → review → repair → gate sequence lives in one run.

### CodeQL / code scanning — add it to the floor

Free on public repos, available on private with Advanced Security. It's a
deterministic security check, which is the kind that belongs in the floor
rather than in a model's opinion — but not inside `npm run ci`. That script
lives in `package.json`, which is a blocked path, and P1 pins its contents.

**Recommended for this build specifically.** V3 handles personal communications
and will eventually hold bridge credentials. A model reviewer will not reliably
notice a path traversal in a file adapter; CodeQL will, every time, for free.

So: add it as its own workflow next to `checks`, and make it a required status
check once you enable branch protection.

### GitHub Pages — out, and this one is worth understanding

Pages was in an earlier draft of this kit and has been removed. It cannot host
this app: Pages serves static files and runs no server, and V3 is a Node process
against a local SQLite file. There is nothing to host there.

Nor is it useful as a synthetic-data review build. A second deployed copy needs
its own fixtures, its own build target and its own drift, and it would be a
public URL attached to a repo whose whole point is that the data stays on one
machine.

**What replaces it: Playwright screenshots as CI artifacts.** Every checks run
loads every route and uploads a PNG per test, on `always()` so you get them from
failures too. That is the visual review — you look at the artifact, not at a
URL. `50-release.yml` cuts the release; you `git pull` on the mini.

### Releases — the evidence bundle

Each release carries commit, check results, review verdict, lane decision and
lockfile hash, plus the pull instructions for the mini. When you ask in four
months why something behaves as it does, this is the answer with a date on it.
Cheap, and it is the only durable record of *why a change was allowed to
merge*. `50-release.yml` is the whole deploy story.

### Repository variables and secrets

`HARNESS_ENABLED` as the kill switch is a **variable**, not a secret — one
click, no re-auth, stops the pipeline and the release within seconds. Model keys
are secrets. Keep the distinction; the two tabs look identical and confusing
them is the most common first-run failure.

---

## Beside the loop — genuinely useful, deliberately not inside it

### Copilot coding agent

**What it does:** assign it an issue and it researches the repo, plans, works on
a branch, and opens a pull request. It runs in an Actions-powered ephemeral
environment, is capped at 59 minutes, works one repo and one branch per task,
and can be triggered from issues, the API, the CLI or VS Code. Available on paid
Copilot plans; org admins must enable it for Business/Enterprise. It cannot
bypass branch protection unless added as a bypass actor.

**Verdict: beside the loop, not inside it — and worth having.**

Inside is wrong because **it opens its own PR**. The harness's whole design is
one workflow run producing one gated PR; an agent that independently opens PRs
runs a second, ungoverned path to `main` that skips your lane classifier.

Beside is right for two things:

1. **A third vendor's implementer.** Assign it an issue the harness stopped on,
   or one you want a different model family to attempt. Its PR still goes
   through `00-checks` and still needs your merge — so it is governed at the
   branch, just not by the pipeline.
2. **Comparison.** Assign the same issue to both occasionally. Where they differ
   is where your issue was ambiguous.

**Do not** wire it as the pipeline's implementer. Two systems opening PRs for
the same issue is how you get duplicate work and a confusing history.

### Copilot code review

Automatic PR review with no workflow file to maintain. Different model family
from Claude, which is the property that matters — a same-family reviewer
inflates its own family's output, consistently and in the same direction.

**Verdict: enable it as a second opinion.** It comments; it does not gate.
Your pipeline's verdict still decides. Cheapest way to get cross-family review
without adding an OpenAI key and per-review API spend.

### Dependabot

`package.json` is a blocked path, so the loop cannot add or bump dependencies —
which is correct and also means nothing updates them. Dependabot opens the PR,
`00-checks` proves it builds, you click merge.

**Verdict: enable, security updates only.** Version-bump noise on a personal
project is not worth the triage — and you already have a triage problem.

### Deployment environments

A `local` environment with a protection rule turns "pull to the Mac mini" into
a recorded deployment with an approval, rather than a `git pull` you have to
remember.

**Verdict: add at the point you have a second machine or a second person.**
Overhead before that.

### Artifact attestations

Signed provenance for build artifacts. Real value in a supply chain; near-zero
for a single-user local runtime you build yourself.

**Verdict: skip for now.** Revisit if V3 ever ships to anyone else.

---

## Out — with reasons

| Capability | Why not |
|---|---|
| **GitHub Projects as the triage queue** | Tempting and wrong. Triage is a typed queue with dispositions, rule proposals, previews and retroactive sweeps. Projects gives you columns. You would lose the entire learning loop — the thing this build exists for |
| **Codespaces** | Fine for poking at the repo, irrelevant to the loop. The runtime is your Mac mini |
| **GitHub Discussions / Wiki** | The repo is the system of record. `docs/` is versioned with the code and reviewed with it; a wiki is not |
| **Actions as the runtime** | A 6-hour job limit, ephemeral storage, and your data in a datacentre. The runtime is local, permanently |
| **Pages, in any role** | It cannot run a Node server or hold a SQLite file, so it cannot be the product; and as a second synthetic-data copy it is a public URL plus its own drift, bought to replace an artifact download |

---

## What to turn on, in order

1. **Actions** — already on, it is the harness
2. **`HARNESS_ENABLED=true`** as a repository *variable*
3. **Read and write workflow permissions**, and allow Actions to create and
   approve pull requests — without this nothing ever merges
4. **CodeQL** — add the workflow, make it a required check later
5. **Copilot code review** — if you have a Copilot plan, free second opinion
6. **Dependabot** — security updates only
7. **Branch protection** — *after* your first green release, requiring `checks`
   and `CodeQL`, with the Claude app and Actions as bypass actors

Steps 1–3 are required. 4–6 take about ten minutes and each one buys something
specific. 7 is the one to do last, deliberately, when the check names exist.
