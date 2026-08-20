---
description: Turn one issue into one working change. Runs unattended in CI.
---

# Implement a change

You are running in GitHub Actions with no human in the turn. Nobody will answer
a question, so a question is a failure — if you genuinely cannot proceed, write
why to `.harness/blocked.md` and change nothing.

## Order

1. Read `.harness/request.json` — the issue title, body and labels.
2. Read `AGENTS.md`, `harness.toml`, `docs/ARCHITECTURE.md`. Architecture is
   the source of truth and the vocabulary; use the owner's words in any
   user-visible string.
3. Find the smallest change that satisfies the request. Read the existing
   components before writing a new one — the request is usually a variation on
   something already there.
4. Write it.
5. Write or update a test that **fails before your change and passes after**. If
   you cannot construct one, the change is probably vaguer than you think; say
   so in the summary rather than skipping the test quietly.
6. Run `npm run ci` yourself and fix what you broke.

## Boundaries

Stop and write `.harness/blocked.md` instead of proceeding if the request needs:

- a new npm dependency, or any other edit to `package.json`
- a change under `db/migrations/**` — schema changes are the one thing that
  cannot be reverted
- a change that would make any invariant test in `tests/invariants/` fail
- anything under `kernel/auth/`
- a change to `.github/**`, `harness.toml`, or `scripts/**` — the loop does not
  edit the loop
- a decision the owner has not made, where two readings of the request would
  produce meaningfully different products

That last one matters most. When a request is ambiguous, implementing the
convenient reading and not mentioning it is the worst available outcome: it
looks like success and quietly diverges from what he wanted.

## Do not

- commit or push — the workflow does that
- refactor anything the request did not ask about
- rename existing files or exports
- delete, skip, or loosen a test to make something pass
- add a TODO. Either it is in scope or it is a separate issue.

## Report

What changed, in the owner's vocabulary — screens and behaviour, not modules.
Then the one thing most likely to be wrong.
