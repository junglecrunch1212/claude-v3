# Machine and device topology

Who runs what, on which machine, as which identity — during build, bootstrap,
launch, and deploy. The repo's code is machine-agnostic; this document is the
part that touches metal, and P5/P6 reference it.

## The one insight that shapes everything

**Apple's own security model forces the member boundary into hardware.**
iMessage history (`chat.db`) and Reminders (EventKit) are readable only on a
Mac signed into that member's Apple ID, under consent grants (Full Disk
Access, Reminders access) given on that machine. There is no server-side way
to read Laura's iMessages — not shouldn't, *cannot*. So the bridge topology is
not an implementation inconvenience; it is **I-7 made physical**. The mini
never holds Apple credentials for anyone. It only receives what a member's own
machine, under that member's own consent, chose to send.

## Machines

| Machine | Tailnet identity | Runs | Talks to |
|---|---|---|---|
| **Mac mini** (`coss-mac-mini`) | service account | Node server + SQLite (launchd), Gmail/Outlook/GCal/Tasks/Plaid adapters, the model call | Google/Microsoft/Plaid APIs outbound; serves the dashboard via `tailscale serve` |
| **James's Mac** | James | his bridge (launchd, his macOS user): reads his `chat.db`, his EventKit Reminders | POSTs to the mini's API over the tailnet |
| **Laura's Mac** | Laura | her bridge, identically, under her Apple ID | same |
| **Phones** | each member | Tailscale app + browser to the dashboard | mini |

Cloud-side sources (Gmail, Outlook, Google Calendar, Plaid) have real APIs, so
their adapters live on the mini. Apple-local sources have no cloud API, so
their adapters live where the data lives — each member's own Mac.

## Identity — one chain, no auth code

Tailscale login **is** member identity, end to end. `tailscale serve` injects
`Tailscale-User-Login` on every request; the server maps it through
`members.tailscale_login` and scopes every query (I-7). A bridge's requests
carry its machine's tailnet identity, so Laura's bridge can only ever write
into Laura's connections — enforced by the same mapping, not by trust. An
unmapped login gets a named 403, never a guest view. This is why
`kernel/auth/**` can stay an empty blocked path: the tailnet is doing the
authentication, and the query layer is doing the authorization, and both are
testable.

Never expose the server by port (`tailscale serve` only, bound to localhost) —
Serve strips client-supplied identity headers and injects the real one; a raw
port trusts a spoofable header. Two more edges (S13): **tagged devices get no
`Tailscale-User-Login` at all** — enrol family devices as users, or they see
403s; and install exactly one Tailscale edition — Standalone and App Store
conflict.

## Backup and restore (S16)

`scripts/backup.sh` nightly via launchd: SQLite backup API (never `cp` a live
WAL database; tolerate `-wal`/`-shm` vanishing mid-walk), encrypt the archive,
ship it off the mini. **Backups exclude Keychain values** — keep a second
recovery plan for the keys or the backup cannot restore a dead machine.
Restore: staging directory → verify → run doctor against it → only then swap,
keeping previous state for rollback. Drill the restore once before trusting
it.

## Secrets

macOS **Keychain**, not dotfiles, on every machine — read via the
Apple-signed `security` CLI as a child process, never a keychain library
linked into node: Homebrew binaries are ad-hoc signed, and an item created
interactively can hang a launchd daemon on an invisible ACL prompt (S8).
`security`'s prompt reader silently truncates ~128 chars and Google OAuth
blobs are longer — store values as ≤96-char fragments with a checksum
manifest. Bridge Macs hold no
secrets at all — their capabilities are TCC consent grants plus tailnet
membership, neither of which is a string that can leak into a repo. `.env`
remains only as the documented inferior fallback, and everything env- or
secret-shaped is already a blocked path.

## Provisioning a machine (once per machine)

Mini: Homebrew → `brew install node@22 git`; `tailscale up`; clone the repo;
`npm ci`; load secrets into Keychain; install
`launchd/com.administrateme.server.plist` (`launchctl bootstrap`);
`tailscale serve --bg https / http://localhost:3000`.

Bridge Mac: same Homebrew/Node/Tailscale steps; clone; install
`launchd/com.administrateme.bridge.plist` under the member's own account;
grant Full Disk Access (iMessage) and Reminders access to the bridge binary
when macOS asks — the grant dialog appearing *on that member's machine, to
that member* is the consent model working. P1 ships both plists and a
`scripts/provision.sh` that does the mechanical parts and prints the two
grants it cannot click.

## Launch and deploy

launchd owns both processes: `KeepAlive` restarts on crash, `RunAtLoad`
survives reboot. Sharp edges from V2 (S9–S11): a GUI LaunchAgent runs only
with a logged-in session — after a FileVault reboot someone must log the
service account in (screen lock is fine, logout is not); upgrades **reload
the plist before `kickstart`** or launchd keeps the old definition;
`kickstart` can return EX_OSERR(37) when RunAtLoad wins the race — verify
loaded state, don't trust the exit code; plists use absolute binary paths
because launchd's PATH is not your shell's; node upgrades are side-by-side
migrations, never `brew upgrade` under a live service (each new binary also
resets TCC grants, S10). Deploy stays pull-based (nothing pushes onto the box holding
household data): on the mini,
`git pull && npm ci && npm run build && npm run doctor && launchctl kickstart -k gui/$(id -u)/com.administrateme.server`
— doctor red means do not restart onto it (S17).
Bridges update the same way, whenever each member pulls; version skew is
tolerated because the bridge API is versioned and additive.

## OpenClaw — considered, and where it landed

V2 runs *on* OpenClaw: the framework owns chat, memory, and model routing, and
AdministrateMe is a plugin inside it. V3 rejects that inversion — the rules
engine and the append-only `decisions` log are the product's authority and
must not live inside a fast-moving chat framework; V2 is the evidence that
substrate sophistication does not produce convergence (462 candidates, 0
rules, on top of all of it). The extraction call is one HTTPS request; it does
not need a router. Where OpenClaw may yet earn a place: it has working
channel plumbing for exactly the two hardest adapters (iMessage, WhatsApp),
and it runs on a member's Mac — which fits this topology. If reused at P5, it
is wrapped **as a per-member bridge process behind the same POST contract**:
an implementation detail of one adapter, replaceable, never the runtime.
