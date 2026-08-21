# Troubleshooting

## Stop everything

Repository → Settings → Secrets and variables → Actions → Variables →
`HARNESS_ENABLED` = `false`. The pipeline and the deploy both refuse to start
within seconds — no agent runs, nothing merges, nothing publishes.

`checks` still runs. That's deliberate: it spends nothing, calls no model, and
you want to keep seeing whether the code compiles while you work out what went
wrong.

---

## Nothing happens when I add the `build` label

In order of likelihood:

1. `HARNESS_ENABLED` isn't `true` — it's a **variable**, not a secret, and the
   two tabs look identical.
2. The label is spelled differently. It must be exactly `build`.
3. `stage` in `harness.toml` isn't `operating`. The pipeline refuses earlier
   stages and comments saying so — check the issue.
4. Actions are disabled for the repo. Settings → Actions → General.

## "Resource not accessible by integration"

Settings → Actions → General → Workflow permissions → **Read and write**, and
tick **Allow GitHub Actions to create and approve pull requests**. Missing the
second tick is the most common single cause of a first-run failure.

## The implement step fails immediately with an auth error

The Claude GitHub App isn't installed on this repo (<https://github.com/apps/claude>),
or neither `ANTHROPIC_API_KEY` nor `CLAUDE_CODE_OAUTH_TOKEN` is set, or the key
is expired. Test the key locally with `claude` before debugging the workflow.

## Every PR ends up `needs-human`

Read the comment on the PR — it names the exact rule. Usually one of:

- `mode = "shadow"` in `harness.toml` (that's shadow mode working)
- the change touched a blocked path — `docs/AUTONOMY-LANES.md` explains which
- deterministic checks are red — read the run log, not the review
- the reviewer still failed it after the repair — read `.harness/verdict.json`
  in the PR body

## It merged but there's no release

1. Actions → **release** — did it run? The pipeline dispatches
   `50-release.yml` explicitly after merging, because a merge made with
   `GITHUB_TOKEN` doesn't raise a `push` event.
2. Workflow permissions must be **Read and write** — cutting a release needs
   `contents: write`.
3. There is no hosted site to change. The mini runs what you last pulled: on
   the mini, `git pull && npm ci && npm run build && npm run start`.

## I merged and the mini is still on the old version

That is the design, not a bug. Nothing deploys to your machine on its own — a
process that can push code onto the box holding your household's data is a
larger trust decision than "merge a styling change." Pull when you want it.

## The dashboard is blank but every check passed

Then the browser smoke test isn't asserting enough. It's supposed to catch
exactly this. Open `tests/e2e/smoke.spec.ts` and add an assertion for the thing
that was missing — a real piece of seeded data, not just the heading. Then file
the actual fix as a normal issue.

This is worth doing properly rather than moving on: a smoke test that passes on
a blank page is the one failure mode that makes every other green tick in the
pipeline meaningless.

## The loop only tried once and gave up

Working as intended. `max_repair_attempts` ships at **1**: one review, one
repair, then a verdict round that judges the repair. Two rounds are wired in
`10-pipeline.yml`, so setting it to `2` costs nothing but a config change.

If the one attempt was a reword rather than a fix, the finding was probably too
vague to act on. Look at `.harness/verdict.json`: a finding without a specific
`file` and `fix` produces exactly this.

## Every PR is coming back needs-human / the loop "stopped approving"

That is a stop, not a failure — read which gate said stop; it names its rule.
If the deterministic checks are the blocker, the code is wrong, not the gate.
If you genuinely need to keep moving, step DOWN the ladder, never around it:

1. full loop → 2. `mode = "shadow"` (loop runs, you merge by hand) →
3. chat agent + hand-merged PRs → 4. local edits.

Every rung keeps `npm run ci` as the floor. The ladder has no rung where the
tests stop running, and any rung is a fine place to live for a while.

## A run is stuck

Cancel it in the Actions tab. Then delete the orphaned `agent/issue-*` branch
and re-apply the `build` label to retry.

## I want to undo something the loop merged

`git revert` the squash commit on `main` and push, then pull on the mini.
Nothing about this pipeline makes a revert harder than normal — that's the whole reason the blocked lane exists,
so that the things a revert *can't* fix never merge themselves.
