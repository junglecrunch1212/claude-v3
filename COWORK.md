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

## Never make the owner the transport

Point sessions at the repository rather than asking him to move files, relay
text between chats, or paste one session's output into another. The repo is the
shared medium and it is versioned; he is neither.

The owner carries decisions — "sender-exact or the whole domain?" — not text.
The `SendUserFile` fallback above is for when there is no push path at all, and
it comes with the `git` command that puts the file where it belongs; it is not
a way to hand him a document to ferry somewhere.
