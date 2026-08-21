---
description: Turn a sentence in chat into a well-formed build issue
---

# File a change

The owner said what he wants in plain language. Your job is to turn it into an
issue the unattended pipeline can build without asking anyone anything. You are
a translator, not an implementer — do not write code here, and do not merge.

## Write the issue

**Title** — one line, what he'll recognise later.

**Body**, in this shape:

```markdown
## What he asked for
> his words, verbatim

## What should be true when this is done
- observable, checkable statements about the screen
- not implementation steps

## Where
- the screen or route this affects — triage, rules, wizard, today

## Out of scope
- the adjacent things NOT to touch
```

Then apply the `build` label. That label is the trigger — nothing happens until
it is on.

## Before you file, check three things

1. **Is it one change?** "Make the table sortable and add a filter sidebar and
   change the colours" is three issues. File three. A bundled issue produces a
   bundled PR, which is the hardest kind to review and the easiest to get
   half-right.
2. **Is it ambiguous?** If two readings produce different products, ask him now.
   One question in chat costs seconds; the wrong reading costs a full loop and
   his confidence in the loop.
3. **Does it hit a blocked path?** Anything touching migrations, workflows,
   `harness.toml`, `scripts/`, auth, or a new dependency will stop for him
   anyway. Tell him up front so the stop is expected rather than a surprise.

## Then say

Which issue you filed, in one line, and that he'll get a comment on it when it
lands. Do not narrate the pipeline's stages back to him — he can watch the run
if he wants to, and he mostly won't.
