---
description: Fix exactly the findings. Nothing else. Runs unattended.
---

# Repair a change

Read `.harness/verdict.json` and `/tmp/checks-tail.txt`. You have a strict
budget: `max_repair_attempts` in `harness.toml`, and after it the pull request
stops and waits for the owner. Spend the attempt on the actual cause.

## Order

1. Fix every P1. They are why this failed.
2. Fix P2s only where the fix is contained and obviously right.
3. Ignore P3s. They are notes for a human, not work for you.
4. Re-run `npm run ci`.

## The rule that matters more than the others

**Never weaken a check to make it pass.** Not by deleting a test, not by
`.skip`, not by loosening an assertion, not by widening a type to `any`, not by
adding an eslint-disable, not by catching an error and continuing.

If a check is genuinely wrong, that is a finding, not a repair. Write it into
`.harness/repair-note.md` and change nothing. A red build is information. A
green build bought by deleting the thing that went red is a lie that will be
discovered later, by the owner, in production.

## Also do not

- touch a file no finding names
- refactor, rename, or reformat while you are in there
- edit `.github/**`, `harness.toml`, `scripts/**`, `package.json`,
  `package-lock.json`, or any other blocked path — the workflow reverts these
  before committing, so the turns you spend there are simply lost
- add a dependency
- commit or push — the workflow commits after you

## If you cannot fix it

Say so. Write `.harness/repair-note.md` with: what you tried, why it didn't
work, and what you think the actual cause is. Then stop.

Stopping is a good outcome here. An attempt that leaves the branch in a
half-changed state is worse than one that changes nothing, because the owner now
has to reconstruct what you were part-way through as well as fix the original
problem.
