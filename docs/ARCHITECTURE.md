# Architecture — the single source of truth

Where any other document disagrees with this one, this one wins.

## The problem, in one paragraph

Things that need doing arrive scattered across many inboxes. The cost of moving
one into where you'll actually look — a calendar, a list — is higher than the
thing feels worth in the moment. So it doesn't get moved, so it's forgotten, and
the pile becomes its own dread. **The bottleneck is the human decision, per
item.** The only test that matters: does the number of decisions go down as a
fraction of what arrives?

## The answer: policy density

V2 holds 462 undecided candidates and zero rules. That is not too much input —
it is **no policy**. Every arrival is a first encounter forever, so the same
twelve senders get re-decided every week. It cannot converge.

Volume is dominated by repeat senders. **A decision about a sender is worth
hundreds of decisions about items.** So: connect everything, and raise the
fraction of arrivals already covered by something decided earlier.

## One mechanism, two moments

> **The New Connection Wizard is zeroing run against the past.
> Zeroing is the wizard run against the present.**

Same grouping component, same four dispositions, same `rules` table. Two entry
points. Building two of anything here is the mistake to avoid.

## The four gates

| Gate | Does | Cost |
|---|---|---|
| 1 · Hostile or worthless | phishing, spam, marketing → quarantine | fixed, mostly deterministic |
| 2 · **Policy** | a rule from the wizard or from zeroing handles it | **grows — this is the whole game** |
| 3 · Seen it already | same thing in two inboxes or two members → one item | fixed |
| 4 · **You** | Add · Remind · File · Drop, plus the checkbox that writes a rule | shrinks as Gate 2 grows |

Between 3 and 4, one model call drafts a proposal. It drafts; it never decides.

## Shape

- **Members** own connections. The privacy boundary is the member: your inboxes
  federate into your queue, Laura's into hers. Households share **destinations**,
  never inboxes.
- **Runtime is local** — Node + SQLite on the Mac mini, reachable over Tailscale.
  There is no hosted deploy and no cloud copy of your data.
- **Destinations** are Google Calendar (has a time) and a reminders list
  (doesn't). The system never holds the only copy of anything.

## The extraction contract — the entire AI surface

```json
{
  "kind":  "calendar" | "reminder" | "file" | "drop",
  "title": "Flight DL2411 to Vancouver",
  "when":  "2026-08-28T06:15:00-04:00",
  "list":  "Personal",
  "why":   "Delta confirmation with a departure time",
  "sure":  true
}
```

One call, one object. Anything else and the item goes to triage undrafted, which
is exactly what you do today — so the floor is "no worse than manual."

## The nine invariants

Each needs a test that fails when violated. P1 writes them before the code.

| | Invariant |
|---|---|
| **I-1** | An item disposed of once never requires the same decision twice. A re-arriving external id matches its prior disposition. |
| **I-2** | A connection with no `wizard_completed_at` may not produce items into the queue. Policy exists before volume. |
| **I-3** | The model may never invent a date. No time in the source means `when` is null and it becomes a reminder, not a calendar entry. |
| **I-4** | `decisions` is append-only. No update, no delete, ever, including in migrations. |
| **I-5** | Every automatic disposal is logged with its rule id and is undoable. Silent suppression is rejected. |
| **I-6** | Wizard and zeroing write to the same `rules` table. A second policy store is rejected. |
| **I-7** | A member may not read another member's items. Destinations are shared; inboxes are not. |
| **I-8** | Finance proposes patterns, never transactions. Minimum three occurrences with a recognisable cadence. |
| **I-9** | A push carries an idempotency key. A re-run cannot duplicate; an undo can always find its target. |

## What is deliberately not built

Knowledge graph engine · context engine · People directory · confidence classes
· readiness states · source accounting · Comms surface · Scoreboard ·
observation mode as a separate mode · cross-member browsing · a forwarding
inbox.

Each was considered and rejected for a reason recorded in
`CONFLICTS-RESOLVED.md` or `docs/PRESENTATION.html`.
