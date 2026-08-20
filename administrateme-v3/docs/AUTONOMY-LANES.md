# Autonomy lanes

What merges without you, what stops and waits, and why the line is where it is.

## The principle

Sort work by **how expensive the mistake is to undo**, not by how confident
anything is that it's right. Confidence is the weakest input to that decision,
because it's the only one the model producing the work can influence.

Three lanes:

| Lane | Example | Cost of one bad merge | Policy |
|---|---|---|---|
| Reversible, contained | a component, a style, a route, a test | one revert | merges itself |
| Reversible, wide | a policy matcher, a shared helper, an adapter | a revert plus a re-run | merges itself at `wide`, stops at `narrow` |
| Hard to reverse | migrations, auth, workflows, dependencies | you can't cleanly undo it | never merges itself, at any mode |

## The blocked list, and why each is on it

From `harness.toml [autonomy] blocked_paths`:

**`**/migrations/**`** — a shipped migration has already run against a database
holding real decisions. Editing one changes what the rows already in it mean,
and there is no revert for that; there is only another migration you write by
hand. `decisions` is append-only (I-4), which is exactly the property a careless
migration destroys.

**`kernel/auth/**`, `**/*.auth.ts`** — a wrong authorization change shows
someone something they shouldn't see. You find out from the person who saw it.

**`.github/**`** — the loop must not rewrite the loop. An agent that can edit
its own guardrails has no guardrails, and the failure is silent: everything
still looks green.

**`harness.toml`, `scripts/**`** — the control surface and the enforcement. Same
reasoning.

**`**/.env*`, `**/*secret*`, `**/*credential*`** — anything holding or naming
a credential. Matched case-insensitively at any depth, because `Secrets.ts` is
the spelling an agent is most likely to produce.

**`package.json`, `package-lock.json`** — two reasons, and the second one is
the load-bearing one. A new dependency is a supply-chain decision, cheap for you
to approve and expensive to discover you didn't. But `package.json` also holds
the `ci` script, which is the *only* gate the pipeline has. An agent that can
edit this file can rewrite `"ci"` to `"true"`, and from then on every check
passes and nothing ever stops. There is no configuration option to open this
lane, because there is no version of it that is safe.

## Modes

- **`shadow`** — everything runs; nothing merges. Every PR gets `needs-human`
  with the reason it *would* have merged. Use for the first few runs, and any
  time you change the blocked list.
- **`narrow`** — only `app/**`, `*.tsx`, `*.css`, `tests/e2e/**`, `docs/**`.
  Nothing in `server/`, `policy/`, `adapters/` or `db/` moves without you.
- **`wide`** — everything except the blocked list. The current setting.

## What happens at a stop

The PR gets labelled `needs-human`, gets a comment saying exactly which rule
stopped it, and the originating issue gets a comment with the link. Nothing is
lost. The branch is pushed, the code is written, the review already ran — you
just click merge, or don't.

## Widening it

Edit `blocked_paths`, run `node scripts/selfcheck.mjs`, and read what it says.
The self-check refuses five removals no matter what you do — workflows, auth,
migrations, `harness.toml`, and `package.json` — and it evaluates them at the
widest mode rather than your configured one, so switching to `shadow` cannot
make the assertion pass vacuously. If you genuinely want one of those open
you have to remove the assertion from `scripts/selfcheck.mjs` in the same
change — which is CODEOWNED, so it's a decision you make in a PR with your name
on it, rather than a config line you edit at midnight.
