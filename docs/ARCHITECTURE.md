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
- **The member boundary is physical where Apple makes it physical** — each
  member's iMessage/Reminders bridge runs on their own Mac under their own
  Apple ID; Tailscale login is member identity end to end
  (`docs/TOPOLOGY.md`). The mini holds no Apple credentials for anyone.
- **The tenant is the instance.** One deployment = one trust domain = one
  SQLite file. The household is this instance. A second trust domain with
  different membership — a startup with co-founders — is a second deployment
  of the same code with its own database, not new rows in this one. The same
  person being a member of both is two member rows in two databases, and needs
  no code. Cross-domain unification already exists where it is safe: in that
  person's own calendar and lists, because the providers own truth and both
  instances push into them.
- **Destinations** are Google Calendar (has a time) and a reminders list
  (doesn't). The system never holds the only copy of anything.

## The extraction contract — the entire AI surface

```json
[
  {
    "kind":   "calendar" | "reminder" | "file" | "drop",
    "title":  "Flight DL2411 to Vancouver",
    "when":   "2026-08-28T06:15:00-04:00",
    "repeat": null,
    "list":   "Personal",
    "url":      "message deep link, when the source has one",
    "evidence": "the verbatim source sentence this was read from",
    "why":      "Delta confirmation with a departure time",
    "sure":   true
  }
]
```

One call, an array of one to five objects — because one email routinely carries
several obligations (a group email with three tasks, an invitation with an RSVP
deadline and an event date). Triage shows them as sub-proposals on one card;
disposing creates child items, each with its own decision trail. `repeat` is an
RRULE the destination provider executes, and it falls under I-3 exactly as
`when` does: no recurrence stated in the source, no recurrence proposed.
`evidence` is a **verbatim quote**, not a paraphrase — the triage card shows it
under the proposal, because a quote is checkable in one glance and a model's
summary is not. An `evidence` string that does not appear in the source body
fails validation the same as an invented date.

Anything off-contract and the item goes to triage undrafted, which is exactly
what you do today — so the floor is "no worse than manual."

**Triage order is plain code, never a model ranking:** rule-floated senders
first, then unanswered person-to-person asks by age, then oldest-first, lapsed
timed items grouped at the bottom. An order you cannot explain on sight is an
order you cannot trust.

## The nine invariants

Each needs a test that fails when violated. P1 writes them before the code.

| | Invariant |
|---|---|
| **I-1** | An item disposed of once never requires the same decision twice. A re-arriving external id matches its prior disposition. |
| **I-2** | A connection with no `wizard_completed_at` may not produce items into the queue. Policy exists before volume. |
| **I-3** | The model may never invent a date — nor a recurrence. No time in the source means `when` is null and it becomes a reminder, not a calendar entry; no stated cadence means `repeat` is null. |
| **I-4** | `decisions` is append-only. No update, no delete, ever, including in migrations. |
| **I-5** | Every automatic disposal is logged with its rule id and is undoable. Silent suppression is rejected. |
| **I-6** | Wizard and zeroing write to the same `rules` table. A second policy store is rejected. |
| **I-7** | A member may not read another member's items. Destinations are shared; inboxes are not. |
| **I-8** | Finance proposes patterns, never transactions. Minimum three occurrences with a recognisable cadence. |
| **I-9** | A push carries an idempotency key (item + provider + payload). One decision may push several things; a re-run cannot duplicate any of them, and an undo can always find its target. |

## What is deliberately not built

Knowledge graph engine · context engine · People directory · confidence classes
· readiness states · source accounting · Comms surface · Scoreboard ·
observation mode as a separate mode · cross-member browsing · a forwarding
inbox · **OpenClaw as substrate** — V2's inversion; the decisions log and
rules engine must not live inside a chat framework, though its channel
plumbing may be wrapped as a per-member bridge at P5 (`docs/TOPOLOGY.md`) ·
**multi-tenancy inside one runtime** — an `orgs`/`spaces` table is
rejected on sight. It would put a scope qualifier in every query, turn I-7
from a boundary into a matrix, and force the auth subsystem (born blocked,
`kernel/auth/**`) into existence, all to rebuild the isolation a second
deployment provides absolutely. Every table is member-keyed from day one, so
if this call is ever reversed a `space_id` migration can be written without
rewriting history — but reverse it in a PR with your name on it, not because
an agent thought it was helpful.

Each was considered and rejected for a reason recorded in
`CONFLICTS-RESOLVED.md` or `docs/PRESENTATION.html`.

## Spine and leaves

The spine is sources → adapters → candidate identification → triage (the
decisions log) → projections → lifecycle: concretely, the seven tables, the
four gates' ordering, the adapter base contract, and invariants I-1 to I-9.
Changing it requires a migration or a blocked-path edit — always a deliberate,
human-approved act, never a side effect. The leaves are where all future work
lives, each with a bounded blast radius: **new adapters** (a provider string +
a subclass; worst case is garbage items, absorbed by triage), **extraction and
gate tuning** (cannot corrupt the spine, CAN rot silently — which is what the
ever-growing fixtures corpus in P2 exists to catch), **dashboard UX**
(read-only projection; no write path), and **lifecycle tweaks** (hemmed by
I-4/I-5/I-9: no history edits, no silent suppression, no double pushes).
Before touching a file, answer: spine or leaf? Spine → stop and say so.

**P1 builds the entire spine — including all four gate slots, wired in their
permanent order with pass-through implementations — and is the only prompt
allowed to touch it.** P2–P7 fill slots and add leaves behind fixed
interfaces. The spine is the MVP: it works with zero rules, zero model calls
and one adapter on day one, and every feature ever added is a leaf grafted
onto it, not a change to it.

## Convergence

This product is designed to be **finished**: seven tables, four dispositions,
about six screens. Success is measured by decisions-per-arrival falling —
which means the correct long-run state of both the queue and this repo is
quiet. `harness.toml [budget]` + `scripts/growth-gate.mjs` enforce it: over
budget and growing is red; shrinking is always green. After P7, prefer a rule
to a feature, a deletion to an addition, and expect good weeks to merge
nothing.

## Completeness

`docs/TEST-REPERTOIRE.md` runs forty-two item shapes — daily to annual, routine
to adversarial — through source → gates → triage → push → lifecycle, and records
the nine gaps that exercise found and closed. When a build prompt feels
ambiguous, the scenarios it covers are the tie-breaker.
