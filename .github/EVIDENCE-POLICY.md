# CI evidence storage

Diagnostics use `./.github/actions/store-evidence` on the owner-managed runner.
Each archive is limited to 32 MiB and 202 files. The private per-repository store
is capped at 1 GiB, expires reports after 3 days by default (7 days maximum),
prunes before publishing and hourly, and refuses writes below 40 GiB free disk.
The seven secondary CI stores can retain at most 7 GiB altogether. They do not
share XIAOMA's evidence directory, account, capacity budget or runner admission.

Do not upload diagnostic reports directly to GitHub. The workflow guard rejects
direct upload-artifact/upload-pages-artifact use. New jobs must invoke the
self-hosted and evidence policy checks after checkout. No hosted fallback.

Only required cross-OS installer delivery uses `bounded-transfer`, with a
128 MiB total input limit and one-day GitHub retention. Preserve downstream
artifact names. This is not a diagnostics escape hatch. Existing paused native
jobs remain paused. Account Actions spending stays hard-blocked at $0; do not
raise cache limits or enable paid usage. Build output above the bound fails
instead of buying additional storage. Completed GitHub Releases are separate
intentional releases, not temporary CI reports.

Host timers run the root-owned reviewed pruning script as the repository's
unprivileged Unix account. They only touch validated records in that private
store; they do not prune Docker volumes, deployments or other repositories.
