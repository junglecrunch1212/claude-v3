# Setup checklist

Six things only you can do, because they need repository-settings access the
agent doesn't have. About ten minutes. Do 1–5 before the first prompt; do 6
after your first green release.

---

### 1. The repo

Create it **empty**. No README, no `.gitignore`, no licence — those create a
first commit, and `00-bootstrap-repo.md` stops when it finds one, because
installing over an existing tree is how work gets silently overwritten.

Private is fine and recommended, and there is no catch — nothing in this kit
uses Pages, so the Free plan is enough. Actions minutes on a private repo come
out of your monthly allowance; a run is five to ten minutes.

### 2. Install the Claude GitHub App

<https://github.com/apps/claude> → Configure → pick your repo.

This is what lets the pipeline read and write pull requests. Without it the
implement and review steps fail immediately with an auth error.

### 3. One secret

Settings → Secrets and variables → **Actions** → New repository secret.

Pick one:

- **`ANTHROPIC_API_KEY`** — from <https://console.anthropic.com>. Billed as API
  usage.
- **`CLAUDE_CODE_OAUTH_TOKEN`** — run `claude setup-token` locally and paste the
  result. Billed against your Claude subscription instead.

Optional, and worth doing once you're past the first few runs:

- **`OPENAI_API_KEY`** — then set `reviewer = "codex"` in `harness.toml`.

That last one is the highest-value change in the whole file. A reviewer from a
different model family than the writer catches things a same-family reviewer
systematically doesn't — a model asked to grade output from its own family
inflates the score, measurably and in the same direction every time. It costs a
second key and buys you a reviewer that isn't quietly agreeing with itself.

### 4. One variable

Same page, **Variables** tab → New repository variable.

`HARNESS_ENABLED` = `true`

**This is your kill switch.** Set it to `false` and the pipeline and the release
both refuse to start, within seconds. The deterministic `checks` workflow keeps
running, which is what you want — it costs nothing and calls no model. This is
the first thing to reach for if something looks wrong.

### 5. Actions permissions

Settings → Actions → General → Workflow permissions:

- ✅ Read and write permissions
- ✅ Allow GitHub Actions to create and approve pull requests

Both are required. Without the second one the pipeline can write code and then
can't open a PR with it, which is a confusing failure to debug.

---

### 6. Branch protection — after your first green release, not before

Do this once you've seen the loop work end to end. Adding it early means
debugging permissions and pipeline behaviour at the same time, and you won't
know which is which.

Settings → Rules → Rulesets → New branch ruleset, targeting `main`:

- ✅ Require a pull request before merging
- ✅ Require status checks to pass → add **`checks`**
- ❌ Do **not** require approvals — that blocks the pipeline's own merges
- ✅ Under Bypass list, add the **Claude** app and **GitHub Actions**

One thing to know: pull requests opened using the default `GITHUB_TOKEN` don't
trigger `pull_request` workflows, which is a deliberate GitHub loop-prevention
rule. So `checks` may not run automatically on pipeline-opened PRs. The pipeline
runs the identical `npm run ci` inside its own run and won't merge on a failure,
so you're covered either way — but if you want the independent second run to
appear as a status check on every PR, add a fine-grained PAT as a secret named
`HARNESS_PAT` and swap the `GH_TOKEN` env in `10-pipeline.yml`. That's a
hardening step, not a requirement.

---

## Checking it works before you trust it

After the bootstrap PR merges, before you paste P1:

1. Actions tab → **checks** should have run and passed, with a notice saying
   `SKIP — no application scaffolded yet`. That skip is correct. A green tick
   claiming to have tested an app that doesn't exist would be the actual problem.
2. Open any issue, add the `build` label. The pipeline should refuse with a
   comment saying the stage isn't `operating` yet, and remove the label. That
   refusal is the stage gate proving it works.

If both behave, the wiring is right and you can paste P1 from
`BUILD-PROMPTS.md`.

## The first real run

Consider setting `[autonomy] mode = "shadow"` in `harness.toml` for it. The
full loop runs — writes, checks, reviews, repairs, opens the PR — and merges
nothing, labelling it `needs-human` with the exact reason it would have merged.
Read the diff, merge it yourself, then set it back to `"wide"`.

Five minutes, and you'll know what the loop does before it does it unsupervised.
