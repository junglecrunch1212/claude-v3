# The 24/7/365 test repertoire

Every shape of thing a two-adult household generates in a year, run through the
system end to end: **source → gates → triage → push → lifecycle**. Each row must
have a home at every stage, or name the gap that was fixed to give it one.

This is the completeness proof for `docs/ARCHITECTURE.md`, and the acceptance
catalogue for the build prompts: when a prompt's done-when feels ambiguous, find
the scenarios it covers here and test those.

**How to read `Home`:** ✅ the shipped design handles it · 🔧 handled after a
gap fix recorded at the bottom (Gn) · ⏳ deliberately later, with the floor
stating what happens meanwhile.

---

## Daily arrivals

| # | Scenario | Source | Path | Home |
|---|---|---|---|---|
| T-01 | Boss's group email contains **three tasks for me** | Gmail | one arrival → extraction returns an **array** → triage shows one card with three sub-proposals → three child items, each disposed separately | 🔧 G1 |
| T-02 | Daily medication | manual, once | Remind + `repeat` daily → provider owns the recurrence | 🔧 G2, G8 |
| T-03 | "Your package arrives **today**" | Gmail | usually rule-Filed at Gate 2. If it reaches triage and today passes, it shows as **lapsed** — visibly stale, never silently dropped (I-4) | 🔧 G9 |
| T-04 | Bank fraud alert by text | iMessage | known short-code sender → rule floats it to the **top** of triage. Gate 1 must clear real bank short-codes by behavioural history, not content | 🔧 G7 |
| T-05 | Dinner plan **emerging across 20 group-chat messages** | iMessage | p2p bar: actor + action + time in one message, or nothing. The floor is manual — you add it when the plan lands. Thread-level extraction is not attempted | ✅ floor |
| T-06 | Laura adds "Apples" to the grocery list | — | **Never enters the system.** A shared list is a provider-native destination; the OS already syncs it to both phones. Today mirrors it read-only. Not everything needs triage — this is the boundary working | ✅ by design |
| T-07 | Receipt for a coffee | Plaid | below every pattern threshold → never surfaces. Plaid proposes patterns, never transactions (I-8) | ✅ |

## Weekly

| # | Scenario | Source | Path | Home |
|---|---|---|---|---|
| T-08 | Trash night, every Tuesday | manual, once | Remind + `repeat` weekly | 🔧 G2 |
| T-09 | Soccer season ICS: **14 games in one file** | Gmail attachment | structured parse, no model → one card, 14 dated entries → one *Add* decision, **14 pushes**, each with its own idempotency key | 🔧 G3 |
| T-10 | Newsletter I actually want to read | Gmail | Remind → "To Read" list, no date. Reading list = an ordinary destination list, not a new surface | ✅ |
| T-11 | An iMessage **asked me for something 2 days ago** and I never answered | iMessage | reply-debt detector: addressed to me + asks + no reply of mine in the thread ≥ N hours → candidate "Reply to Sam", deep link back to the thread. Ages toward the top of triage deterministically | 🔧 G6, G7 |
| T-12 | House cleaner texts "can we move to Friday?" | iMessage | arrives linked to the existing pushed event (Gate 3 recognises same-thread) → card offers **update the push**, not a second event | 🔧 G4 |

## Monthly

| # | Scenario | Source | Path | Home |
|---|---|---|---|---|
| T-13 | Dog's flea/tick + heartworm, **the 5th of every month** | vet email or manual | Remind + `repeat` monthly-on-the-5th. If bought on autoship, Plaid later proposes the same pattern — Gate 3 dedups against the existing rule's items | 🔧 G2 |
| T-14 | Mortgage, **first Thursday of every month** | Plaid pattern | pattern card: merchant, inferred cadence, the 3+ dates behind it → one accept = recurring calendar entry, `repeat` = first-Thursday RRULE. Missed-occurrence watch ("not seen by the 10th") is ⏳ later; the floor is the calendar entry itself | 🔧 G2 |
| T-15 | Utility autopay receipt | Gmail | wizard-made rule → Gate 2 → auto-Filed with `decided_by = "rule:<id>"`, undoable (I-5). You never see it | ✅ |
| T-16 | Credit-card statement, due date inside | Gmail | one item, **two pushes**: calendar entry on the due date + File the statement | 🔧 G3 |
| T-17 | HOA dues | Plaid | pattern, quarterly cadence | ✅ |

## Interval (not calendar-aligned)

| # | Scenario | Source | Path | Home |
|---|---|---|---|---|
| T-18 | HVAC filter every 90 days | manual | Remind + `repeat` every-90-days | 🔧 G2 |
| T-19 | Oil change: 5,000 miles **or** 6 months | manual | floor: the date half only. Mileage is a sensor the system doesn't have; the reminder says "or at 5k miles" in the title | ✅ floor |
| T-20 | Prescription refill every ~28 days | pharmacy email | Remind + interval repeat; the pharmacy's own reminder email gets a Gate-2 rule so you don't decide it twice (I-1) | 🔧 G2 |

## Annual and seasonal

| # | Scenario | Source | Path | Home |
|---|---|---|---|---|
| T-21 | **Best friend's birthday** | manual or Contacts (later adapter) | one item, **two pushes**: annual calendar entry + a lead-time reminder ("gift — 10 days before"), each idempotent, each undoable | 🔧 G3 |
| T-22 | Car registration renewal | state email or paper | email: normal path. Paper: T-27's manual capture | ✅ |
| T-23 | Property tax, semiannual | Plaid | pattern, semiannual | ✅ |
| T-24 | Insurance auto-renews — you want to **price-check before** it does | Plaid + email | pattern accept creates the renewal entry; the price-check is a second push with negative lead time, same as T-21's gift reminder | 🔧 G3 |
| T-25 | Tax documents trickle in Jan–March | Gmail | rule: sender-domain matches brokers/employers → auto-File to target "Taxes 2027". The seasonal checklist ("got W-2? got 1099?") is ⏳ later; File-to-target is the floor | ✅ floor |
| T-26 | School publishes the year calendar | Gmail + ICS | same as T-09, at 60 entries. One decision, 60 pushes, no model involved | 🔧 G3 |

## Irregular, adversarial, and lifecycle

| # | Scenario | Source | Path | Home |
|---|---|---|---|---|
| T-27 | **Jury summons on paper** | physical mail | manual capture: type it, or photograph it (photo-OCR is a later adapter). Manual is a pseudo-connection per member, wizard-exempt because you *are* the policy | 🔧 G8 |
| T-28 | Permission slip, sign by Friday | Gmail | Remind with due date + deep link. The attachment stays in the email — the system never holds the only copy | ✅ |
| T-29 | Invitation: RSVP by the 1st, event on the 15th | Gmail | one item, two pushes: RSVP reminder + calendar hold | 🔧 G3 |
| T-30 | Return window closes in 30 days | Gmail | Remind with due date | ✅ |
| T-31 | Warranty expires in 2031 | manual | Remind, far future. Nothing special — dates are dates | ✅ |
| T-32 | **I owe 5 email replies** — 3 business, 2 personal | Gmail + Outlook, sent scope | reply-debt detector per connection; business and personal land in each account's own queue, push to different lists. Detection is behavioural (no reply of mine exists), never content judgment | 🔧 G6 |
| T-33 | I asked the plumber for a quote; **he hasn't answered in 4 days** | Gmail sent | the same detector inverted: waiting-for. ⏳ later phase — same thread-state scan, opposite direction; schema needs nothing new | ⏳ |
| T-34 | "Practice is **cancelled** tonight" | Gmail | Gate 3 links to the pushed event → card offers undo-the-push (recorded as a decision, I-4) + File | 🔧 G4 |
| T-35 | An email **in Laura's inbox** contains a task for **James** | her Gmail | her queue, her decision (I-7 — it never appears in his triage). She pushes to a shared destination or to his list. Assignment travels through destinations, never through inboxes | ✅ |
| T-36 | Doctor's office moves the appointment | Gmail | supersede: same thread, new time → new item linked to the old, card pre-filled as an update to the existing push | 🔧 G4 |
| T-37 | 2am voice-note idea | Notes (transcribed) or manual | the P6 bar: a commitment needs a thing to do and usually a when. "Thinking about the Panama question" stays a note; "call the tax attorney before the 15th" becomes an item | ✅ |
| T-38 | Phishing "invoice overdue — pay now" | Gmail | Gate 1, before extraction, always. No candidate, no contact surfaced. V2 once turned one phishing mail into four tasks; that is why Gate 1 is first | ✅ |
| T-39 | Same bill arrives in Gmail **and** Outlook | both | Gate 3: second arrival auto-disposed as duplicate, `duplicate_of` the first, `status='auto'` — one decision, full trail | ✅ |
| T-40 | A sender I **Dropped** re-arrives next month | any | I-1: re-arriving external id / rule match → same disposition, logged, undoable. Never re-decided | ✅ |
| T-41 | A rule turns out over-broad and swallowed a real obligation | — | Rules screen → switch off → its items come back (I-5). The trail shows every item it disposed | ✅ |
| T-42 | Mac mini is off for a week | — | adapters resume from `last_synced_at`; `UNIQUE (connection_id, external_id)` makes re-sync idempotent; pushes are idempotent (I-9). Nothing doubles | ✅ |

---

## The gaps this exercise found, and the fixes

**G1 · One arrival, many obligations (split).** The contract returned exactly
one object, so T-01's three tasks had no home. Fixed: extraction may return an
**array** (1–5 objects); triage renders sub-proposals on one card; disposing
creates child items with `parent_item_id`, each with its own decision trail.
The parent's decision records `action = 'split'`.

**G2 · Recurrence had no representation.** T-02, T-08, T-13, T-14, T-18, T-20
are the backbone of household administration and none could be expressed. Fixed:
`repeat` (an RRULE string, or null) in the contract and on `pushes`. **The
provider executes the recurrence** — Google Calendar and Reminders already do
this well, and the system never holds the only copy. I-3 extends: the model may
never invent a repeat, same as it may never invent a date.

**G3 · One decision, many pushes.** The idempotency key was defined as
`item_id + provider`, with a UNIQUE constraint — so T-09's 14 games, T-16's
entry+file, T-21's event+gift-reminder were structurally impossible. Fixed:
idempotency = `item_id + provider + payload hash`. The UNIQUE constraint stays;
what changed is what it means.

**G4 · Supersede and cancel.** T-12, T-34, T-36: a change to a thing already
pushed looked like either a duplicate (swallowed by Gate 3 — the update lost) or
a fresh item (second calendar entry — the update doubled). Fixed: same-thread
arrival with a prior pushed item links via `supersedes_item_id`; the card
pre-fills as an update or an undo of the existing push. Every step is an
appended decision (I-4).

**G5 · Duplicates without an eighth table.** "One item, two sources" implied a
join table. Instead the second arrival is a real item auto-disposed as
`duplicate_of` the first — the trail is complete, I-1 holds, and the schema
stays at seven tables.

**G6 · Reply debt.** T-11 and T-32 are among the highest-anxiety items a person
carries and no inbound-only adapter can see them, because the signal is a
**message that doesn't exist** — your reply. Fixed: connections gain an optional
sent-mail scope (the wizard asks); the detector is purely behavioural — asked +
no reply of mine + N hours. Waiting-for (T-33) is the same scan inverted,
deferred, schema-ready.

**G7 · Aging and ordering.** A queue sorted oldest-first buries the urgent under
the stale. Fixed: deterministic ordering — rule-floated senders first (T-04),
then unanswered p2p asks by age (T-11), then the rest oldest-first. Plain code,
never a model ranking, so the order is explainable on sight.

**G8 · Manual capture.** "+ Add" existed in wireframes but had no source. Fixed:
one `manual` pseudo-connection per member, `wizard_completed_at` set at creation
— I-2 holds trivially, because you are the policy.

**G9 · Lapsed items.** A timed proposal whose time passes while queued (T-03) is
worthless but must not vanish (I-4). Fixed: computed state — `when` in the past
and still `new` renders as lapsed, groups at the bottom, one-tap File/Drop.
No new column; it's derivable.

## What deliberately has no home, and why that is correct

Ambient shared lists (T-06) — the OS does this; duplicating it adds sync bugs
and subtracts nothing. Completion tracking — the checkbox lives in the
destination; Today reads it back, the system doesn't mirror-write it.
Thread-level plan extraction (T-05) — below the p2p bar on purpose; wrong
extractions cost trust the system cannot buy back. Mileage/sensor triggers
(T-19) — no sensor, honest floor. Missed-payment watch (T-14) and waiting-for
(T-33) — real, valuable, and **later**: both are additive (a detector and a
watcher over existing tables), neither needs a migration, which is what makes
deferring them safe.

## Sources over time, without breaking anything

The extension point is one TEXT column: `connections.provider`. Adding a source
is a new provider value plus an adapter — **no migration, no schema change** —
and every new connection passes the same two gates that protected the first
one: the wizard must run before it may produce items (I-2), and its early
queue is a zeroing session that writes its rules.

Most of the world already speaks email. Amazon, schools, doctors, airlines,
banks, the DMV all notify by email — so the Gmail/Outlook adapters are
meta-adapters, and most "new sources" are new *rules*, not new code. The true
adapter roadmap is the non-email channels, in the order the pain justifies:

1. **P1–P7 (built):** Gmail, Outlook, Google Calendar, Google Tasks, iMessage, WhatsApp, Plaid, one notes store, sent-mail scope for reply debt
2. **Near:** Apple Calendar, Apple Reminders write-through, Contacts (birthdays → T-21 automated), ICS subscription URLs
3. **When the pain justifies it:** photo capture for paper (T-27), voice-note transcription (T-37), read-later, additional notes stores
4. **Never:** anything that requires the system to hold the only copy of the data it touches
