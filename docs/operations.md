# Operations

Updated: 2026-10-09. Implemented local probes, safe structured HTTP logs, authenticated Prometheus metrics/rules, worker heartbeat, encrypted backup/isolated restore tools, bounded security retention and read-only load checks. Production Compose/ingress/schedule templates are prepared; a live deployment and external alert/storage destinations still require operator configuration.

## Availability, telemetry and alerts

- GET /api/health/live: process liveness, no external dependency. Always 200 while serving.
- GET /api/health/ready: real PostgreSQL SELECT 1 and Redis PING; 200 ready or 503 unavailable, only dependency booleans returned. Probes bypass the Redis route limiter so a limiter outage can be diagnosed. SMTP/provider activation are separate concerns.
- GET /api/metrics: dedicated Bearer METRICS_TOKEN (≥32 characters), independent of user JWT; 503 if disabled, 401 if token incorrect. Protect through private network/loopback/TLS. No privileged user session required by monitoring.
- Worker heartbeat: Redis project-prefix key, 45-second TTL refreshed every 15 seconds; local /tmp file after successful Redis heartbeat supports Docker healthcheck. Process healthy does not guarantee SMTP accepted every email.

HTTP JSON logs include requestId, method, static matched route, status and duration. They exclude request/response bodies, query strings, credentials, concrete resource IDs and personal addresses. Unmatched routes use one label; route series bounded to 200 plus overflow. Metrics include RSS/uptime, HTTP requests/5xx/latency histogram, due notification count/oldest due lag, last-day unretried terminal email failures and current worker heartbeat. PostgreSQL partial indexes support pending/failure queries. Retried parent failures stop counting once a child exists; failure of the child becomes a new terminal leaf. Histograms/counters reset on process restart; no distributed exact accounting is claimed.

Monitoring uses optional docker-compose.monitoring.yml, pinned Prometheus image, loopback port 9090, 512 MiB/0.5 CPU and seven-day/1 GiB TSDB retention. Review/update image pins before a real release. Private token file is generated under ignored tmp/monitoring (parent0700); never print or commit it. [Prometheus configuration reference](https://prometheus.io/docs/prometheus/latest/configuration/configuration/).

```sh
node scripts/ops/prepare-monitoring.mjs
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml --profile monitoring up -d prometheus
```

Rules: unavailable scrape >2min, 5xx ratio >2% for5min, p95 >1s for5min, notification lag >5min for10min, terminal failures for5min, missing heartbeat for2min. These are initial operational thresholds, not a production SLA. Prometheus UI shows pending/firing alerts; **no external notification destination is configured**. Alertmanager/receiver/email/chat/paging integration must be selected before externally delivered alerts can work. Probe failures are verified in temporary infrastructure; never stop shared PostgreSQL/Redis merely to test alarms.

## Backup and verified restoration

scripts/ops/backup.mjs streams pg_dump custom format through AES-256-GCM (random nonce, authenticated header, 16-byte tag) into a mode0600 archive; no plaintext dump file. SHA-256/inventory manifest also mode0600. Explicit dedicated Pettly database/user/container, no shell interpolation/password in command text or logs. PETTLY_BACKUP_KEY must be exactly64 hex characters and stored separately from the archive, with an independently recoverable secure copy. Losing it makes backups unrecoverable. MAIL_ENCRYPTION_KEY must also be preserved to use restored pending emails.

Verification authenticates checksum and the complete GCM tag in a discard-only first pass before executing SQL, then streams a second decryption pass into a fresh Docker PostgreSQL with network=none, no host ports, bounded resources and a random password. It compares migration and critical users/orders/bookings/credentials/inbox row counts. Temporary restore container is always removed; **there is no command to overwrite a shared/live database**. Entire SQL archive/schema/data are restored; count checks are sanity evidence, not a checksum of every row or proof of business correctness. Quiesce source writes for manifest comparisons; pg_dump is transactionally consistent but the manifest count query is separate. Match source PostgreSQL major using PETTLY_BACKUP_IMAGE (default postgres:17-alpine). [pg_dump](https://www.postgresql.org/docs/17/app-pgdump.html), [pg_restore](https://www.postgresql.org/docs/17/app-pgrestore.html).

```sh
# Prefer operator secret environment/file, never literal secrets in shell history.
pnpm ops:backup --container global_postgres --database pettly_db --user pettly_dev --file /secure/pettly/snapshot.pettly
pnpm ops:restore:verify --file /secure/pettly/snapshot.pettly
# Reads private .env/PETTLY_ENV_FILE, decodes dedicated DB credentials, unique output path:
node scripts/ops/backup-job.mjs --verify
```

PETTLY_DB_PASSWORD supplies dump-role password; backup-job obtains it from the explicit database URL without logging it. PETTLY_POSTGRES_CONTAINER chooses source, PETTLY_BACKUP_DIR chooses private destination. backups/ is ignored by Git/Docker. Containers/tools need Docker access; operator access to Docker is privileged and must be restricted.

Linux systemd examples under ops/systemd prepare daily02:30UTC backup and weeklySunday03:30UTC restore drill. They are templates, not installed timers on this Mac. Adapt runtime/project path, dedicated operator, source and secret environment file; validate with systemd-analyze verify on deployment host and enable only there. Remote/object storage credentials are not configured: copy **encrypted** archive+manifest off-host through a selected secure storage mechanism. Keep encryption keys separate. No backup purge is automatic; operator must approve off-host retention/redundancy and storage budget. Local backup alone is not disaster recovery.

Initial planning targets: daily backup implies up to24h recovery point; restoration time must be measured at production dataset size. No PITR/WAL archive, zero-loss guarantee, high availability or production RTO is claimed. Recovery runbook: freeze writes, choose/check archive, verify in isolation, provision a new dedicated DB, restore there under controlled operator tooling, validate migrations/invariants/secret dependencies, point a reviewed deployment at it, resume traffic, monitor. Never replace the shared server or another application's DB.

## Retention policy and scheduled cleanup

scripts/ops/retention.mjs defaults to dry-run; --apply executes a bounded PostgreSQL transaction/advisory lock with at most500 candidates per category. Expired sessions older than30 days are physically removed with their refresh-token hashes; expired action tokens older than30 days removed. Active tokens/sessions preserved, including consumed refresh tokens of a live family needed for replay detection. Terminal/delivered/expired outbox ciphertext cleared; all delivery metadata retained. No global Redis flush or key scan, no business/audit deletion.

```sh
pnpm ops:retention
pnpm ops:retention --apply
```

Thirty days is an explicit technical grace period for expired security records, **not a legal retention assertion**. Orders, payment/capture/audit, consented adoption/booking snapshots, inbox history and credential audit/evidence have no automatic time purge. Explicit owning-feature removals already purge Media bytes; account identity anonymization remains Users/Auth's responsibility. Legal/commercial retention, consent withdrawal, holds, archival, audit-safe redaction and private evidence retention require separate reviewed policies; destructive blanket cleanup is not fabricated.

Production operations-profile retention service executes every15min, with failure logs and30sec child deadline; RETENTION_APPLY=false reports candidates until explicitly enabled. Skip credentials/history on expiration: invalid eligibility is enforced from deadlines, not by erasing evidence. Maintenance runs only against a Pettly-prefixed database. Scheduler/timers are prepared, not activated in shared local data during verification.

## Deployment and rollback

Standalone docker-compose.production.yml accepts explicit immutable API/web/admin image tags/digests, dedicated production DB/Redis prefix, independent secrets, HTTPS origins/client URL and actual SMTP sender/provider. API/worker images run nonroot, read-only root with /tmp tmpfs, bounded CPU/memory, graceful shutdown and healthchecks. Ports bind loopback; ops/Caddyfile.example prepares a host TLS reverse proxy once real DNS/domains are supplied. Frontends remain base apps; this template does not complete their business screens.

Separate migration job: runtime RUN_DATABASE_MIGRATIONS=false prevents concurrent automatic migrations. Development image default retains migrate-on-start. Do not substitute production secrets/roles with dev settings.

```sh
docker compose --env-file /secure/pettly.env -f docker-compose.production.yml config --quiet
# Backup + isolated drill before release; use reviewed immutable images.
docker compose --env-file /secure/pettly.env -f docker-compose.production.yml --profile tools run --rm migrate
docker compose --env-file /secure/pettly.env -f docker-compose.production.yml up -d --wait api worker web admin
```

No production deployment was attempted. Required choices: server/provider and infrastructure access, DNS/domains/TLS, verified SMTP, off-host backup storage/key custody, alert receiver and measured capacity. Use compatible additive migrations; revert application image only when old code supports the expanded schema. Prefer forward repair for data/migration issues; never run destructive automatic down migrations. Multi-replica rolling deployment needs an orchestrator/traffic-draining strategy beyond this single-host Compose template. No hosting provider account/resource was created.

## Measured load and verification

scripts/ops/load.mjs restricts URLs to localhost/127.0.0.1, read-only live/services/adoptions/catalog paths, concurrency1–20, duration1–60sec, 5sec request deadline and a50ms per-worker pause. JSON report records request count/rate, p50/p95/p99, statuses and dependency/server failures; credentials/payloads omitted. 429 counts are visible separately; do not mistake fast throttled responses for capacity. This is a bounded smoke-load check, not production saturation, authenticated-checkout load or database sizing certification.

```sh
pnpm ops:load --url http://127.0.0.1:3100/api --seconds 10 --concurrency 5 --out /tmp/pettly-load.json
```

Integration runner uses temporary PostgreSQL/Redis/Mailpit, seeded functional fixtures, encrypted backup/full isolated restore/corruption rejection, safe read-only load, and readiness503/liveness200 with **only its temporary Redis stopped**. Retention applies only to synthetic expired rows and confirms live account/session access. Promtool validates metric configuration/alert expressions; deployment template validated with placeholders, without starting a production deployment. Unit/architecture/lint/type/build/schema/OpenAPI checks accompany module tests.

## Local verification evidence — 2026-10-09

Migration 013 was applied only to pettly_db using pettly_dev on the existing PostgreSQL 15 shared server; seven credential/clinical guards are present and no professional credential was seeded. API and worker are healthy; anonymous metrics/credential routes return 401, authorized metrics return 200 with a live worker heartbeat. English OpenAPI contains 190 operations. Prometheus target pettly-api is up and all six rules are loaded; UI is http://localhost:9090.

A mode0600 encrypted snapshot of the actual local Pettly DB was restored into a disposable PostgreSQL 15 with no network. Migration and critical counts matched; a wrong encryption key and manipulated ciphertext with a recomputed SHA-256 were rejected before any SQL execution. Archive/manifest remain in ignored backups/, key in private .env; off-host custody/storage and Linux timers are still pending configuration.

The [bounded local load report](verification/operations-load-2026-10-09.json) records 265 requests over five seconds with concurrency three: all 200, zero errors, p95 13 ms and p99 21 ms. This tiny local development dataset does not establish production capacity.
