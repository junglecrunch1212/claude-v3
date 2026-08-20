# COWORK.md — Cowork adapter

Read `AGENTS.md` first.

Cowork is the right place for the bootstrap, the P1–P6 build prompts, and
translating plain sentences into issues. It is the wrong place to merge — that
is the pipeline's job, and doing it by hand bypasses every gate in this repo.

If the connected folder has the repo but the session cannot push, use the GitHub
MCP tools (`create_branch`, `push_files`, `create_pull_request`). If neither is
available, write the files locally, deliver them with SendUserFile, and give the
owner a one-line `git` command — do not pretend the push happened.

Use AskUserQuestion when a build prompt leaves a real choice open — never to
re-ask something `docs/ARCHITECTURE.md` already decides. The owner is a frontend
person; do not translate his answers into database language when you read them
back to him.

After each build prompt, deliver the result as a rendered artifact — the screen
it produced, plus which invariant tests pass and which are still red — so he can
check it without reading the diff.
