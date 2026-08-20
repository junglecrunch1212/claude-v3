# Cold start — how the extraction policy gets written

This is the document the whole system turns on. Read it before touching triage,
dispositions, rules, or the wizard.

## The failure it prevents

V2 is live and holds **462 undecided candidates and zero rules**. Every arrival
is a first encounter forever. The same twelve senders get re-decided every week,
the queue never converges, and the pile becomes its own dread — which is the
exact problem the system was built to remove.

The diagnosis is not "too much input." It is **no policy**. A queue with no
policy is a to-do list with extra steps.

## The measure

> **Decisions per item must fall as a fraction of arrivals.**

Not queue depth. Depth without a slope is a mood, not a measurement. A queue at
40 and rising is worse than a queue at 200 and falling. Every counter this
system shows must carry its direction.

The second number is **policy coverage**: the percentage of arriving volume
already handled by something you decided earlier. It should climb steeply, then
flatten high. Flat-and-low means the learning loop is broken and nothing else
in the product matters until it isn't.

## One mechanism, two moments

> **The New Connection Wizard is zeroing run against the past.
> Zeroing is the wizard run against the present.**

Same grouping component. Same four dispositions — Add · Remind · File · Drop.
Same `rules` table. Two entry points.

This is invariant I-6 and it is the highest-leverage constraint in the repo.
Building two grouping UIs, or a second policy store, produces two things that
drift apart and a user who cannot predict either one.

### Moment 1 — the wizard, before a single item arrives

A new connection is scanned against its own history *before* it is allowed to
produce anything into the queue (I-2). Senders are clustered, ranked by volume,
and shown with a running coverage figure. You decide about senders, not items.

Senders are described by **behaviour, not content**: how many messages, whether
you ever replied, whether you ever opened one. Never "this looks unimportant" —
a model's opinion about importance is not something you can check in a glance,
and behavioural facts are.

Anyone you did not decide about goes to triage. The unknown is never
auto-disposed.

The wizard's success condition: **rules covering a majority of a mailbox's
volume exist before its first item reaches the queue.**

### Moment 2 — zeroing, against what has accumulated

Zeroing is a bounded session against the live queue. Its output is not an empty
queue — it is **a set of rules**. Forty items disposed and six rules made beats
two hundred disposed and none, because the second one is manual labour you have
agreed to repeat next week.

`playbooks/20-zero-the-queue.md` is the procedure.

## The four gates

Every arriving candidate passes through these in order. Only Gate 4 costs you
anything.

| Gate | Does | Cost over time |
|---|---|---|
| 1 · Hostile or worthless | phishing, spam, bulk marketing → quarantine | fixed, mostly deterministic |
| 2 · **Policy** | a rule from the wizard or from zeroing disposes it | **grows — this is the whole game** |
| 3 · Seen it already | same thing in two inboxes or two members → one item | fixed |
| 4 · **You** | Add · Remind · File · Drop, plus the checkbox that writes a rule | shrinks as Gate 2 grows |

Between Gate 3 and Gate 4 one model call drafts a proposal. It drafts. It never
decides, and it never disposes.

## The checkbox

Every disposition offers **"always do this for …"** in the same gesture. Not on
another screen, not in a settings page, not later.

If making a rule costs more than one click, no rule will ever be made. V2 is the
proof: 462 candidates, 0 rules, and a settings page that supports rules just
fine.

Scope starts narrow — sender-exact, then sender plus subject pattern — and is
widenable afterwards. Widen only after the narrow rule has run clean for a week.
An over-broad rule that swallows one real obligation destroys trust in the
mechanism permanently: you stop believing the quiet, and once you are checking
behind the system you have two systems.

## Preview, then activate, then sweep

A rule that cannot show you what it catches is a rule you cannot audit later.
Before activation, show three things:

- **forward count** — how many items currently in the queue it would dispose
- **historical count** — how many it would have disposed
- **the browsable list** — you are looking for the one item that should not be
  in there

On activation it **sweeps retroactively**: every matching item in the queue is
disposed as one recorded, reversible batch. Without the sweep, a rule only helps
with future arrivals and the backlog still has to be cleared by hand — which is
how you get 462.

Every automatic disposal records `decided_by = "rule:<id>"` and is undoable
(I-5). Switching a rule off brings its items back.

## Expected shape of the first ninety days

| Phase | Start | Target | Shape of the work |
|---|---|---|---|
| Day 1 | ~460 | under 100 | bulk, by sender. Vendor mail, receipts, notifications |
| Week 1 | ~100 | steady | the ambiguous middle, one at a time |
| Month 1 | inflow | inflow ≤ outflow | above ~10/day means a rule is missing |
| Month 3 | — | under 5/day | you surface rule candidates, not items |

By month three the queue should be showing you **groups that need a policy**,
not items that need a decision.

## Why connections are added one at a time

`BUILD-PROMPTS.md` P5 connects Gmail, then Outlook, then iMessage, then
WhatsApp, then Laura's — and does not start the next until the previous one's
queue has been zeroed once.

This is not caution, it is diagnosis. Connect four at once and you cannot tell
which one is generating the noise, so you cannot tell which policy is missing.
iMessage and WhatsApp go last, after the person-to-person bar has been proven
against transactional volume where the answers are obvious.

## `decisions` is the training data

The append-only `decisions` table is not an audit log that happens to be useful.
It is the record from which rules are proposed, and the reason a disposition can
be explained six months later. Nothing in it is ever updated or deleted (I-4).

Model-side learning from your dispositions — a system that "picks up on" what
you drop — is explicitly rejected. It produces behaviour you cannot name, cannot
audit and cannot revert. Learning happens by writing a rule you can see, switch
off, and point at.
