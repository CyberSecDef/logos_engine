# Home-server operation and recovery

Run from the repository directory as the same OS user who owns the saves and
provider logins. This is a local, single-player service for a trusted home LAN.
Only one server or CLI writer may use a world directory at a time.

## Install and start

Use Node.js 22.12+ and the committed npm lockfile:

```sh
npm ci
npm run build
npm start
```

The production server uses the built files in dist/ and defaults to
0.0.0.0:5180. Open the printed Network URL from another host. localhost refers to
the browser's own machine. Keep the terminal/process running; stop with Ctrl+C
and wait for it to exit. A process supervisor must use the repository as its
working directory and allow shutdown to finish before starting a replacement.

Optional .env settings are shown in [.env.example](../.env.example). Existing
process environment variables take precedence. Restart after editing .env.
Use HOST=0.0.0.0 for LAN access, a fixed PORT from 1 to 65535 for normal use, and
ALLOWED_HOSTS for additional DNS names. Port 0 is supported for isolated tests.
Never run a CLI step/create operation alongside the server.

npm run dev is for editing and uses an isolated temporary Vite cache. Prefer
npm start for play. npm start does not build: missing/stale dist files require
npm run build. After deployment, refresh browser tabs to load the current assets.
No service worker or offline client is installed.

## Update without losing worlds

1. Pause time and finish or cancel any advisor request. Close playing tabs.
2. Stop the server and wait for shutdown.
3. Make the complete-directory backup below.
4. Check git status; preserve local work and .env. Record git rev-parse HEAD
   alongside the backup so the matching application version is known.
5. Run git pull --ff-only, npm ci, then npm run check. Resolve any failure before
   starting the new build.
6. Run npm start, refresh the browser and check the active world's day and
   selected settings before resuming play.

Worlds, .env and local credentials are not in Git. Time advances only through
explicit ticks while playing; downtime is not simulated on restart. A prior
application version may not understand a newer save. Roll back application and
its matching stopped-server backup together, preserving the newer directory.

## Full backup

An in-game checkpoint is useful for experiments, but it lives alongside the
world and is not protection against disk/directory loss. Portable exports are
useful for moving a world; keep a full directory backup for exact local recovery,
including conversations, active-world selection and other sidecars.

With the server and all CLI writers stopped, from the repository directory:

```sh
backup_dir="$HOME/logos-backups/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$backup_dir"
git rev-parse HEAD > "$backup_dir/application-commit.txt"
tar -czf "$backup_dir/worlds.tar.gz" worlds
sha256sum "$backup_dir/worlds.tar.gz" > "$backup_dir/worlds.tar.gz.sha256"
tar -tzf "$backup_dir/worlds.tar.gz" > "$backup_dir/contents.txt"
```

Check every command succeeds. Store another copy on a separate device; a backup
on the same disk alone does not survive disk failure. The archive contains all
of worlds/, including hidden active-world metadata, state envelopes, journal
records, checkpoints, plugins, artwork and conversations. Preserve the complete
tree; state.json alone is insufficient for journal-linked saves.

Keep .env separately in a private location if needed; never publish it or include
credentials in portable worlds. Native Claude/Cursor/Codex logins live outside
worlds/ and should be reauthenticated on a new host rather than copied into worlds.
The application does not automate filesystem backups or backup retention.

## Restore to a stopped server

Use a backup you created and the matching application commit recorded with it.
First stop all writers. Verify the archive and inspect its contents:

```sh
backup_dir="/absolute/path/to/the/chosen/backup"
sha256sum -c "$backup_dir/worlds.tar.gz.sha256"
tar -tzf "$backup_dir/worlds.tar.gz"
restore_dir="$(mktemp -d)"
tar -xzf "$backup_dir/worlds.tar.gz" -C "$restore_dir"
```

Verify the archive contains the expected worlds/ tree before proceeding. Preserve
the current directory instead of overwriting it. Choose an unused recovery name:

```sh
mv worlds "worlds-before-restore-$(date +%Y%m%d-%H%M%S)"
mv "$restore_dir/worlds" worlds
```

If worlds/ was already missing, skip the first move. Build the matching application
version, then while the server is still stopped validate a chosen world:

```sh
npm run world -- inspect first-world
npm run world -- verify-history first-world
npm start
```

Substitute your actual world ID. verify-history has a default 10,000-day replay
budget; consult its output rather than assuming every longer history was verified.
The saved active-world selection is restored with the directory. Check the world,
day, artwork and checkpoints in the browser. Retain the pre-restore directory until
satisfied; do not merge its individual files into the restored save.

## Startup and provider troubleshooting

| Symptom | Action |
| --- | --- |
| Missing dist server or unstyled/missing web assets | Stop, run npm ci and npm run build from the repository, restart and refresh. |
| EADDRINUSE | Another process owns the port. Stop the old server or choose a different port; do not start a second writer against worlds/. |
| Invalid PORT | Use an integer in the supported range; startup rejects it before touching saves. |
| Browser cannot connect from another host | Confirm the printed Network address, HOST=0.0.0.0 and host/network firewall access to the configured port. |
| Host not allowed | Use the server IP or add your local DNS name to ALLOWED_HOSTS and restart. |
| Session required after restart | Refresh the browser for a new session token. |
| Cannot open saved world / integrity error | Stop and preserve the entire directory. Restore a known-good complete backup. Never delete a damaged save to trigger initialization. |
| Selected world missing | Restore its directory and selection metadata together. Startup does not silently substitute a new world. |
| Advisor unavailable or authentication expired | Simulation/manual controls remain usable. Review the provider configuration below and authenticate as the server user. |

A fresh install creates first-world only when that directory and explicit
selection metadata are absent. An existing first-world directory with a missing
save, invalid JSON, failed integrity checks or missing journal records is an error;
it must not be replaced with a fresh world.

The server .env selects claude-code (default), cursor, codex or anthropic.
Local CLI providers require the supported native executable, Linux/bubblewrap and
the server user's existing login. API configuration remains server-side. The UI's
provider label indicates selection, not proof that a login remains valid.
The adapter checks availability/authentication when the player sends a prompt;
startup and deterministic ticks do not call a model. Requests can fail, time out
or be cancelled without automatically applying proposals.

Use the existing [provider setup and supported-version notes](prompt-workflow.md)
for executable overrides and authentication. Do not copy credentials into chat,
world files or a backup intended for sharing. No automatic provider upgrade,
authentication refresh probe or billable model test is part of this runbook.

## Verification scope

tests/local-operation.test.ts exercises invalid ports, missing/damaged saves and
a stopped complete-directory tar archive extracted and restored under an isolated server. It checks
active selection, exact file preservation, history verification, unchanged world
state and no offline progression, with a provider that rejects all model calls.
Existing checkpoint and portable-world browser tests cover in-game recovery.

These checks establish application recovery behavior. They do not simulate disk
failure, guarantee an external backup device or provide cross-process writer
locking. The one-writer rule remains operational.
