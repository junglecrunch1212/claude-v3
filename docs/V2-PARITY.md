# V2 parity — will P0–P7 get you at least as far as the running system?

Assessed 2026-08-20 against the live dashboard
(`coss-mac-mini…/member/today`, 68 visible records, observation mode on) and
the public repo (`junglecrunch1212/administrate-me-now`: Python + OpenClaw,
encrypted event log, thirteen views, role-based member portal).

**Short answer: yes for everything Today actually does, by the end of P6 —
and past it in the one dimension that matters by the end of P3. No for four
framings V3 cuts on purpose, listed so the cut is a decision you re-made, not
a surprise. Three regressions were found and fixed in the prompts.**

---

## What was on the live Today page, feature by feature

| V2 Today feature (observed live) | V3 equivalent | Arrives |
|---|---|---|
| **Moves** — 5 open Google Tasks (Captain flea & tick, Amex, Rent…) | Today mirrors the reminders lists read-only | P6 |
| **Day context** — events from 3+ calendars (his, `Laura work busy/free`, `Charlie Mom and Dad Schedule`, shared-with-him) | Today mirrors **all visible calendars**, not just the push target | P6 *(was a gap — fixed, see R1)* |
| **Timed / on the clock** | same mirror, timed section | P6 |
| **"3 possible provider copies" grouped per move** | read-only same-title grouping across lists | P6 *(gap — fixed, R1)* |
| **Freshness** — "latest source 12:39 PM · 68 records" | per-connection `last_synced_at` line on Today | P6 *(gap — fixed, R1)* |
| **"Why is this here"** on every row | `why` in the contract + the `decisions` trail; every rule-disposal names its rule | P2/P3 |
| **Needs a decision (30)** embedded in Today | the triage screen, linked from Today with **depth + slope**, never the full list | P1 |
| **Member identity** — "Jimmy · Principal · Tailscale" | member switch scoping every query; bind it to the Tailscale identity header, same mechanism V2 uses | P1 *(fixed, R3)* |
| **+ Add for review** | the `manual` pseudo-connection | P1 |
| **Messages to notice** | reply-debt detector, which V2 does not have | P7 |
| **Encrypted event log** (SQLcipher) | SQLite **must not silently regress to plaintext** | P1 *(gap — fixed, R2)* |

## Where V3 passes V2 — the reason the rewrite exists

The live page is the argument. Of the 30 pending decisions: the Deel phishing
mail generated **four** of them and displayed the attacker's phone number as a
support line — the exact incident Gate 1 exists for. Monarch generated four
separate "add this reminder?" questions from one digest. Cloudflare three,
MyChart two, GoDaddy two, WP Engine two (both junk). One arrival → many
questions is V2's extraction shape; V3's is the inverse — one arrival → **one
card** (sub-proposals when it truly carries several obligations), phishing
quarantined before extraction ever runs, and each disposition offering the rule
that makes the sender never ask again.

Same week of the same inboxes, run through V3: ~12 cards instead of 30
questions, and after the first zeroing session most of those senders are
rule-handled. V2 has held **462 candidates and 0 rules** because rules live in
a settings page nobody visits; that number cannot fall. V3's whole design is
that it falls. That crossover happens at **P3**, three prompts in.

Also new relative to V2 as deployed: Outlook, iMessage, WhatsApp (P5), Plaid
(P6), reply debt (P7), the wizard gating every connection behind
policy-before-volume (P4).

## What V3 deliberately does not rebuild — confirm you still agree

- **The Day Brief narrative** ("Here is the shape of your day…"). Counters with
  slopes replace prose. A model narrative is a model opinion you can't check at
  a glance.
- **Time guardrails / capacity classes** ("Laura work hours · context until
  5:00 PM", soft-load warnings). The underlying busy/free events still appear
  in Day context; the framing layer is cut.
- **Attended / Missed gestures** feeding back into the system. Today is
  read-only; completion lives in the provider's checkbox.
- **Observation mode as a mode.** V2 is running in it right now, which means
  V2 currently *writes nothing* — its five Moves are pre-existing tasks, and
  every approval is a "would happen" record. V3 writes real, idempotent,
  undoable pushes from P1. Switchable rules + logged undoable disposals (I-5)
  replace the mode.
- **Thirteen views, roles/portal, OpenClaw, the encrypted event-sourced
  kernel.** The seven-table design replaces all of it; `CONFLICTS-RESOLVED.md`
  and `docs/PRESENTATION.html` hold the arguments.

## Regressions found by this comparison, fixed in the prompts

- **R1 — Today was under-specified.** "Mirror of the calendar and the lists"
  did not say *all visible calendars*, didn't group provider copies, didn't
  show freshness. P6 now says all three.
- **R2 — Encryption at rest.** V2 ships SQLcipher; the V3 prompts said
  "SQLite" and would have silently regressed a database that will hold both
  members' correspondence. P1 now requires either SQLCipher
  (`better-sqlite3-multiple-ciphers`, key in `.env` on the mini) or an explicit
  recorded decision to rely on FileVault. Silent plaintext is not an option.
- **R3 — Member identity.** V2 already solves login-free member scoping with
  Tailscale identity. P1 now binds the member switch to the Tailscale identity
  header when present, manual switch otherwise — same tailnet, same mechanism,
  no auth code (which stays a blocked path).

## Cutover — run in parallel, then retire

1. V2 is in observation mode and writes nothing to providers, so **there is no
   double-push risk** while both run. Leave it exactly as it is.
2. Build V3 through P4. Reuse what V2 already earned you: the Google Cloud
   OAuth client, the Tailscale serve setup on the mini, and your Monarch alert
   emails — which, with two Gate-2 rules, do most of Plaid's job until P6.
3. Run the P4 wizard on the Gmail account V2 watches. Zero the first queue.
   This regenerates everything V2's 462 candidates know **from the source
   inboxes themselves** — no database migration exists or is needed, and the
   462 stop being a backlog and become the first zeroing session.
4. When a week of V3 has inflow ≤ outflow, stop V2's ingester and keep its
   repo read-only as the archive.

One number decides whether the rewrite worked: **decisions per week, falling,
while connected volume rises.** V2's is flat at 1.0 per item by construction.
