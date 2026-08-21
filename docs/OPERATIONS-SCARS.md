# Operational scars — what V2 already paid for

Mined from V2's own postmortems, live-activation failure logs, and bootstrap
code (`MAC-MINI-OPERATIONS.md`, `co-013/017/018` evidence, `doctor.py`,
`backup_restore.py`, `macos_keychain.py`, cursor store, Gmail/Calendar
adapters). Each entry: the trap, when you'd have discovered it, and where V3
now handles it. **P1/P2/P5/P6 reference this file; it is not optional
reading.**

## Data-integrity traps (discovered weeks in, after damage)

**S1 · Gmail first-run cursor bootstrap can silently exclude the whole
mailbox.** V2's first-use branch stored a `historyId` and never listed
messages — everything green, nothing ingested, and the reviewed example was
older than any recent-only backfill. Rule: snapshot `historyId` FIRST (the
incremental floor, so mail arriving during backfill is never lost in the gap),
then bounded backfill — default 730 days / 1,000 messages, oldest-first per
thread so an anchor is never assessed before its context. The backfill window
is a recorded decision, not a default. *(P5 wizard, history step.)*

**S2 · A message can 404 between `list` and `get`.** Someone deletes an email
in the race window. That is a per-record terminal disposition, not a source
failure — V2 mislabelled it once and one deleted email put the whole account
into permanent backoff. *(P1 adapter contract.)*

**S3 · Error classification is four-way, per provider.** 429 → transient,
honor Retry-After. 401/403 → fatal, stop and surface (restarting won't fix a
revoked token). 5xx → transient. Other 4xx → api-changed, surface. Gmail
`history.list` 404 = stale cursor → full re-list (dedup makes it safe).
Calendar sync token 410 GONE → discard token, full window resync. Treat any of
these as generic failure and the sync either dies permanently or loops.
*(P1.)*

**S4 · At-least-once delivery + naive dedup = duplicates or a wedged queue.**
V2 needed six live generations to kill this: read-before-append dedup races
even at low concurrency. The fix is atomic first-writer arbitration —
`INSERT OR IGNORE` against the UNIQUE key, and **the conflict loser treats the
outcome as success**, never as a failure to retry. Applies to items
(`connection_id, external_id`) and pushes (`idempotency`). *(P1; I-9.)*

**S5 · Model-call retries need fresh identities and a hard timeout.** Reusing
the same idempotency identity for a retry replays the recorded failure
forever. Retry as `<id>:retry-1`, `:retry-2`, bounded at 2, 60 s timeout, then
terminal → the item arrives undrafted (the floor). *(P2.)*

**S6 · Provider time is not ingestion time.** Substituting `now()` for a
missing provider timestamp turns a two-year-old backfilled email into today's
item, permanently. V2 ran a full schema generation + replay to repair this.
`items.received_at` is provider time; `items.ingested_at` is ours; a missing
provider time quarantines the record. Triage shows both when they differ.
*(Schema; P1.)*

**S7 · Every fetched record ends in exactly one terminal state.** item ·
no-candidate · quarantined · failed. Without this, "queue is quiet" and
"adapter silently died" are indistinguishable — the false zero. This was the
single V2 check that caught nearly every silent stall. V3's lite version:
adapters write `connections.last_sync_stats` (fetched / items / quarantined /
failed) every run; Today shows it as the freshness line; `npm run doctor`
alarms on fetched=0 across N runs for a connection that historically fetches.
*(P1; partially reverses this kit's "source accounting" cut — the evidence
won.)*

## macOS traps (discovered at first launchd start, first reboot, first update)

**S8 · Keychain + Homebrew interpreters: works in Terminal, hangs under
launchd.** Homebrew node/python are ad-hoc signed; a Keychain item created
interactively can prompt (= hang a headless daemon) when launchd runs the same
interpreter. And `security`'s prompt reader **silently truncates ~128 chars**
— Google OAuth blobs are longer. Store secrets in ≤96-char fragments with a
checksum manifest, read via the Apple-signed `security` CLI as a child
process. *(TOPOLOGY §Secrets; provision.sh.)*

**S9 · GUI LaunchAgents need a logged-in session.** FileVault reboot →
services down until someone logs in; logging out kills them; screen lock is
fine. Also: `launchctl kickstart` can return EX_OSERR(37) when RunAtLoad wins
the start race (verify loaded state, don't trust the exit code), and an
upgrade must **reload the plist before kickstart** or launchd keeps executing
the previous definition. *(TOPOLOGY §Launch.)*

**S10 · TCC consent is one-shot per signed binary.** A denied prompt never
reappears — repair is manual in System Settings. Denial gives EventKit empty
result sets, not exceptions: the bridge "works" and reads nothing. If no
dialog appears within two minutes, go grant it by hand, then kickstart. A
node upgrade is a new binary — grants reset. *(TOPOLOGY §Provisioning.)*

**S11 · launchd's PATH is not your shell's.** Bare `node` resolves wrong or
not at all; a side-by-side node install relinks under a running service.
Plists use absolute binary paths; runtime upgrades are explicit side-by-side
migrations, never `brew upgrade` under a live service. *(TOPOLOGY.)*

**S12 · Startup order is a contract.** The server must not begin syncing (or
replaying queued work) before its dependencies pass a real health probe — V2
lost two guarded activations to replay-against-a-dead-seam. And blocking
provider I/O at startup starves your own `/healthz` exactly when a supervisor
is watching: first sync runs after the port is open, never before. *(P1.)*

## Identity, network, time (discovered at first family rollout / first DST)

**S13 · Tailscale sharp edges.** Standalone and App Store editions conflict —
install one. **Tagged devices receive no `Tailscale-User-Login` header** — a
family member's tagged iPad silently gets a 403. Serve strips client-supplied
identity headers (why serve-only is a hard rule — a raw port trusts a
spoofable header). Logins are emails, not device names. *(TOPOLOGY
§Identity.)*

**S14 · "Today" is a timezone, not a date.** Compute day boundaries in the
household IANA timezone as a half-open UTC window, or late-evening events and
DST-transition days land on the wrong Day view twice a year. Recurrences store
timezone + rule + local time. *(P1; P6 Today.)*

**S15 · Google-backed calendars visible in Apple Calendar are owned by the
Google adapter only.** Touch them via EventKit too and every event doubles.
Reminders sync needs symmetric never-sync exclusions (list names, tags) in
AND out. *(P6.)*

## Recovery scaffolding (discovered during the incident — the worst time)

**S16 · Backing up live WAL-mode SQLite with `cp` yields corrupt backups.**
Use the SQLite backup API; tolerate `-wal`/`-shm` vanishing mid-walk; encrypt
the archive; and know that **backups exclude Keychain values** — a dead mini
needs a second recovery plan for its keys, or the backup is a paperweight.
Restore = staging dir → verify hashes → rebuild → run doctor → only then swap,
keeping the previous state for automatic rollback. An untested restore is not
a backup: drill once. *(P1 ships scripts/backup.sh; TOPOLOGY §Backup.)*

**S17 · One `npm run doctor` with named checks, wired into deploy.** Encrypted
db reachable · migrations current · per-connection cursor + last_sync_stats
sane (S7) · launchd state · identity header present on a loopback probe ·
backup freshness · one synthetic round trip (insert fixture item → dispose →
push recorded with idempotency). The pull command becomes
`git pull && npm ci && npm run build && npm run doctor && launchctl kickstart -k …`
— doctor red means don't restart onto it. *(P1.)*

**S18 · Push-layer record mode.** One env flag (`PUSH_MODE=record`) makes the
push function write would-have-pushed rows instead of touching providers.
Every V2 live failure was survivable because writes were suppressed while
trust was earned. Use it for each new connection's first zeroing session, then
flip to live. One if-statement; it buys the same insurance. *(P1; P5 —
a lite re-adoption of V2's observation mode, on the same evidence.)*

**Not covered by V2 either** — expect first-hand discovery: Outlook and
WhatsApp live behavior, live Plaid (V2 was sandbox-only), Gmail push/pub-sub
(V2 polls at 120 s — poll first, it's fine), long-idle resource growth, and
macOS major-update behavior. iMessage knowledge in V2 is second-hand
(BlueBubbles docs); the `chat.db` realities — text living in `attributedBody`
typedstream blobs on modern macOS, tapbacks arriving as separate rows that
must not become items, edits/unsends — are in P5's bridge checklist and will
still need live proof.
