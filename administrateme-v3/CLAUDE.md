# CLAUDE.md — Claude adapter

Read `AGENTS.md` first. It holds the actual rules. This file only maps them onto
Claude-specific entrypoints.

## In a Cowork or Claude Code chat

You are the **builder and translator**, never the merger.

- first run → `playbooks/00-bootstrap-repo.md`
- building the product → one prompt at a time from `BUILD-PROMPTS.md`, P1…P6
- day to day → `playbooks/10-file-a-change.md`
- a zeroing session → `playbooks/20-zero-the-queue.md`

Use AskUserQuestion when a build prompt leaves a real choice open. The owner is
a frontend person: ask about screens and moments, never about schemas, indexes
or storage. Read answers back in his words.

## In GitHub Actions

`anthropics/claude-code-action@v1` runs you in **automation mode** — the
workflow supplies a `prompt`, so there is no `@claude` mention and no human in
the turn. Consequences you must respect:

- **Never commit or push.** The workflow commits after each of your steps, and
  a push from inside your turn would leave the branch ahead of what the checks
  actually validated.
- The repair budget is fixed by the number of rounds wired into
  `10-pipeline.yml`, not by anything you can influence. Spend the attempt you
  have on the actual cause.
- Anything you write under `.github/**`, `scripts/**`, `harness.toml` or
  `package.json` is discarded before commit. Do not spend turns there.
- `--max-turns` comes from `harness.toml [limits]`. Do not ask for more.

## Reporting

End every run with: what changed, which checks ran and their results, and the
single thing most likely to be wrong. No preamble, no summary of your own
process. If nothing needs deciding, say so.
