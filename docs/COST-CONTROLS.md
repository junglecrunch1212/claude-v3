# Cost controls

Every dial, what it does, and what happens when it's wrong.

## The dials

All in `harness.toml`:

| Setting | Default | Bounds |
|---|---|---|
| `limits.max_turns_implement` | 30 | how long one write can go |
| `limits.max_turns_review` | 15 | how long one review can go |
| `limits.max_turns_repair` | 15 | how long one fix can go |
| `limits.max_prs_per_day` | 30 | hard daily ceiling, resets UTC midnight |
| `autonomy.max_repair_attempts` | 1 | how many times it retries before giving up (see note) |
| `autonomy.max_open_agent_prs` | 2 | backpressure — further issues are told to wait |

Plus the `HARNESS_ENABLED` repository variable. Set it to `false` and everything
stops within seconds.

## Rough shape of a run

At the shipped `max_repair_attempts = 1`: one implement call, one or two review
calls, zero or one repair call, plus roughly five to ten minutes of Actions
time. **Two model calls best case, four worst.** Raising the setting to 2 makes
the worst case six.

Job wall-clock is capped in the workflow files rather than in `harness.toml`:
60 minutes for the pipeline, 20 for checks, 20 for the release. Those are
backstops against a hung run, not budgets. On a public repo Actions minutes are
free; on private they come out of your monthly allowance. Nothing here runs on
a schedule, so an idle week costs nothing.

The number that actually drives cost is `max_repair_attempts`. Each attempt is a
review *and* a repair. Going from 1 to 3 does not triple the cost of a bad
run — it does worse than that, because the runs that need a third attempt are
the ones burning the most context per attempt.

Two rounds are wired in `10-pipeline.yml`; the setting decides how many are
used. **Lowering it works on its own; raising it past 2 does not.** `0` skips
repair entirely and leaves review gating; `1` skips round 2; `2` uses both.
Setting it above the number of wired rounds fails the self-check with a message
telling you to add the round in the same change — which is the point: making an agent loop
longer should be a deliberate edit, not a number you nudge.

## The four ways this gets expensive

**A loop that re-triggers itself.** The classic failure: agent pushes, push
triggers workflow, workflow runs agent, repeat until someone notices the bill.
This harness is structured so it cannot happen — the whole loop is steps inside
one workflow run, so there's nothing to re-trigger. If you ever split the stages
into separate event-triggered workflows, this becomes the thing to worry about
above all others.

**Retrying without new information.** One attempt is the shipped cap because the
second attempt on the same failure is usually the same guess in different
words. `playbooks/07-repair-change.md` tells the repairer to stop and
explain rather than try again blind.

**Bundled issues.** One issue asking for five things produces a large diff, a
long review, and a repair that has to hold all five in context. Three small
issues cost less in total than one big one and each is reviewable.

**Vague issues.** "Make it look better" burns an implement call on guessing.
`playbooks/10-file-a-change.md` makes the chat agent ask you before filing.

## Watching it

- Actions tab → run duration and step timings
- <https://console.anthropic.com> → usage, if you're on an API key
- `gh pr list --label harness --state all` → how many the loop has opened

If a run looks stuck, cancel it in the Actions tab. Cancelling mid-run can leave
a branch with no PR; delete the branch and re-apply the `build` label.
