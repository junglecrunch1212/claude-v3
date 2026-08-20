---
description: How an agent proposes a rule from a disposition. Read before touching the rule-proposal path.
---

# Propose a rule

Every disposition proposes a rule. This is the highest-leverage code path in the
system and the easiest to get subtly wrong.

## Scope narrow, then widen

Propose the **narrowest scope that would have caught this item**, in this order:

1. `match_sender` exact
2. `match_sender` + `match_subject_contains`
3. `match_sender_domain`

Those are the three matchers `rules` has (`docs/SCHEMA.sql`). Anything wider
needs a migration, which is a blocked path — so if you find yourself wanting a
fourth, say so and stop rather than inventing one.

Never propose a semantic scope ("things about billing"). A scope you cannot
evaluate deterministically is a scope you cannot audit, and it will drift.

## Always show the blast radius

A proposal without a preview is rejected. This is a product rule from
`docs/COLD-START.md`, not one of the nine invariants — but it is the one that
decides whether the owner ever trusts a rule enough to make another. The
preview carries:

- **forward** — how many current candidates it would dispose
- **backward** — how many historical items it would have disposed
- **the list**, browsable

If the forward count is 1, say so plainly — a rule that catches one item is
usually not worth making, and offering it anyway trains the owner to click
past previews.

## Never

- activate without the owner's action
- propose a rule from a single `File` — filing one receipt is not a policy about
  the sender, and a rule offered off one ambiguous decision is the fastest way
  to teach him to click past previews
- widen an existing rule silently — a widened rule is a **new version**, with
  its own preview
- learn from dispositions without a rule. Implicit model-side tuning produces a
  system whose behaviour cannot be explained, audited or reverted (I-5)

## Report

One line: what the rule catches, how many, and what it would have caught
historically. Not a paragraph — the owner is mid-session and reading fast.
