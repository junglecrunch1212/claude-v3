---
description: Write the harness kit into an empty repo. First run only. No app code.
---

# Bootstrap the repo

You are in a chat project connected to an empty GitHub repo, with this kit
attached. Your only job is to get every file from the kit into the repo on a
branch, prove the harness validates itself, and open a PR.

**Do not scaffold any application code. Do not create `package.json`. Do not
start building the product.** That is `BUILD-PROMPTS.md` P1, and it happens
after this PR is merged.

## What you need from the owner

Two things. If either is missing, ask once, in one message, then proceed.

- the repo, as `owner/name`
- his GitHub username, for `owner` in `harness.toml`

## Steps

1. **Confirm the repo is empty.** Zero commits. If it has any, stop and say so
   rather than merging into someone's existing work — an unexpected file here
   means you are pointed at the wrong repo.

2. **Give it a `main` to branch from.** A repo with zero commits has no refs at
   all, so there is nothing to branch *from*: the create-branch API needs a base
   sha and the contents API refuses a branch that does not exist. Commit the
   kit's `.gitignore` alone to `main` first, and confirm `main` is the default
   branch.

   Do not skip this by pushing `harness-bootstrap` directly. GitHub makes the
   first pushed branch the default, `main` would never exist, and four things
   would then break at once: `--base main` in `10-pipeline.yml`, the
   `origin/main...HEAD` diff the lane classifier reads, and the `branches:
   [main]` triggers on `00-checks.yml` and `50-release.yml`.

3. **Create the branch `harness-bootstrap`** from `main`.

4. **Write every file from the kit**, preserving paths exactly. Directory
   structure matters — `scripts/selfcheck.mjs` checks for specific paths and
   the workflows reference them by name.

   Include the dotfiles. `.gitignore`, `.github/CODEOWNERS`,
   `.github/ISSUE_TEMPLATE/*` and `.github/actions/review-round/action.yml` are
   easy to skip by accident and each one breaks something quietly.

5. **Replace `@OWNER`** everywhere it appears — `harness.toml`,
   `.github/CODEOWNERS`, and anywhere else it occurs — with his actual GitHub
   username, keeping the `@`. Leave `project_name` as `administrateme-v3`.

   Grep for `@OWNER` afterwards. If any remain, the self-check will fail on the
   placeholder test and CODEOWNERS will silently assign reviews to nobody.

6. **Create the three labels the pipeline uses** — `build`, `harness`,
   `needs-human`:

   ```
   gh label create build        --color 0e8a16 --description "run the pipeline on this issue"
   gh label create harness      --color ededed --description "opened by the pipeline"
   gh label create needs-human  --color d93f0b --description "stopped and waiting for the owner"
   ```

   `build` in particular must exist **before** the first issue. It is the only
   trigger the pipeline has, and `10-pipeline.yml` creates it *inside* a run
   that cannot start until it exists — so without this step the owner opens an
   issue, finds no `build` label to apply, and nothing ever runs.

7. **Run `node scripts/selfcheck.mjs`.** It must exit 0. It needs Node 18+ for
   `node:fs` and the TOML loader in `scripts/harness-config.mjs`.

   If it reports a problem, fix the cause and rerun. Do not edit the self-check
   to make it pass — it is the only thing standing between a typo in
   `harness.toml` and a gate that is silently switched off.

8. **Open a pull request** titled `Install AdministrateMe V3 harness`. In the
   body, list: the file count, the self-check output, and the three things the
   owner must confirm are set before merging —
   - the `HARNESS_ENABLED` variable is `true`
   - one of `ANTHROPIC_API_KEY` or `CLAUDE_CODE_OAUTH_TOKEN` is set
   - Actions has read/write permissions and may create and approve PRs

9. **Stop.** Report what you pushed. Do not merge it yourself — the owner merges
   this one by hand, because it is the change that grants everything afterwards
   its authority.

## What should be true after the merge

- `checks` runs on the PR and passes, reporting
  `SKIP — no application scaffolded yet`. That message is correct: the app-exists
  probe looks for a directory named exactly `app`, and there isn't one yet.
- Labelling an issue `build` does nothing, because `stage = "bootstrap"` and the
  pipeline refuses to run before `operating`. That is the intended state — the
  loop stays shut until P5 opens it.
- `50-release.yml` runs on the merge and reports `SKIP — nothing scaffolded
  yet`. It keeps doing that until P1 creates `package.json` and `app/`.

## Do not

- add a README that duplicates `START-HERE.md`. There is exactly one entry point
  and two would drift apart within a week.
- "improve" any file while transcribing it. Several of these read oddly on
  purpose — the shell-quoting in `10-pipeline.yml` and the per-path loop in the
  commit step are both fixes for specific defects, and normalising them
  reintroduces the bug.
- set `stage` to anything other than `bootstrap`.
- create issues or milestones. The three labels in step 6 are the only ones,
  and no others are needed.
