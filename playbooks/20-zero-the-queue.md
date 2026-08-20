---
description: Run a zeroing session. The session IS how the extraction policy gets written.
---

# Zero the queue

Read `docs/COLD-START.md` first. This playbook executes it.

**The point of a zeroing session is not an empty queue. It is a set of rules.**
An empty queue with zero rules means you did the work by hand and will do it
again next week. Forty items disposed and six rules made is a better session
than two hundred disposed and none.

## Before you start

- Say how long you have. Zeroing is bounded work; an unbounded session is
  abandoned work.
- Note the starting depth. It goes in the session record.
- Check what is connected. Zeroing works one connection at a time; a session
  spanning four inboxes cannot tell you which one is generating the noise.

## The loop

1. **Group, don't scroll.** Zeroing groups by sender and by subject pattern.
   Work the largest group first — it has the highest rule yield per decision.
2. **Decide the group, not the item.** "What should happen to Monarch mail?" is
   one decision covering nineteen items. Nineteen decisions is the failure mode.
3. **Take the rule proposal every time it is offered.** If you find yourself
   thinking "I'll make the rule later," you will not, and the group returns next
   week.
4. **Read the preview before activating.** Forward count, historical count, and
   scan the list. You are looking for the one item that should not be in there.
5. **Widen only after watching.** Start sender-exact. Widen to domain after the
   narrow rule has run clean for a week. An over-broad rule that swallows a real
   obligation destroys trust in the entire mechanism, and you will stop
   believing the quiet.
6. **Use `File` liberally.** Most transactional mail is a fact, not an
   obligation. "Budget exceeded by $1,165" is worth recording and not worth
   actioning. If you are stuck between `Add` and `Drop` and neither fits, the
   answer is `File`.
7. **Stop on time.** Record the session. The counter does not reset.

## Targets by phase

| Phase | Start | Target | Shape of work |
|---|---|---|---|
| Day 1 | ~460 | under 100 | bulk, by sender. Vendor mail, receipts, notifications |
| Week 1 | ~100 | steady | the ambiguous middle, one at a time |
| Month 1 | inflow | inflow ≤ outflow | above ~10/day means a rule is missing |
| Month 3 | — | under 5/day | surface rule candidates, not items |

## What good looks like after a session

- the counter is lower and did not reset
- every rule you made has a preview you actually read
- the session record names what you disposed and which rules came out of it
- **percent of recurring senders classified** went up

## What to tell the owner afterwards

Depth before and after, rules created, and the largest remaining group by
sender. That last one is the next session's first decision.
