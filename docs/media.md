# Media module

Updated: 2026-10-08. Implements private sanitized animal/product-image storage through public application ports. See [Animals](animals.md), [Adoptions](adoptions.md) and [DESIGN](../DESIGN.md).

## Purpose and boundary

Media owns encoded image metadata/bytes and the image-processing adapter. Animals owns attachments and resource authorization; Adoptions owns public listing visibility. Media deliberately exposes no unrestricted upload/read HTTP route or public storage directory. Other features may consume its application port after checking their own resource permissions. The current resource integrations are animal/product photos and private sanitized veterinary evidence images. Catalog owns product attachments and public visibility.

The framework-free MediaAsset invariant caps encoded dimensions/size. MediaHandlers uses ImageProcessor and MediaRepository output ports plus runtime clock/entropy. Sharp and Prisma are outbound adapters; Nest is composition only. Public ports return metadata or bytes, never raw database rows or client-selected storage paths.

## Input processing and security

- Multipart upload is capped at 5 MiB, one file and two text fields (reason and expectedVersion). The authentication guard runs before the upload interceptor. Owner/shelter authorization is rechecked before decoding/persistence.
- Accepted content: single-frame JPEG, PNG or WebP. Declared MIME must match the decoded format. SVG, GIF, disguised text, corrupt/truncated images and animated/multipage content are rejected.
- Maximum input is 20 megapixels. Sharp decoding uses a pixel limit and fails on warnings. Rotation follows orientation; output fits inside 1600×1600 without enlarging, transparent areas become white, and JPEG quality is 82.
- Output is at most 2 MiB and strips EXIF/ICC/other supplied metadata. Original filename/content is not stored. Paths and filenames cannot select objects; UUID resource binding governs access.
- At most ten attachments per animal or product; an additional PostgreSQL guard validates attachment resource identity and count. Animal and product uploads use a Redis route limit of 20/minute per IP.
- Private and public image responses are image/jpeg with Cache-Control no-store. Public delivery additionally checks current active shelter/animal, published state and approved/current attachment intersection. Revocation affects subsequent server reads; it cannot erase bytes already downloaded.

## Storage decision and data

The implemented adapter stores sanitized bytes in PostgreSQL bytea, bounded per object, together with metadata. This makes byte creation/purge, attachment, version and audit fully transactional with the existing shared database and requires no external provider credentials or new public bucket. Catalog/list queries never fetch image bytes.

This adapter has an explicit capacity tradeoff: photo storage and backups increase PostgreSQL size and I/O. It is suitable for the current bounded delivery, not a claim that relational storage is the optimal large-media backend. Before large-volume media expansion, replace the output adapter with private object storage and introduce durable promotion/deletion outbox processing, reconciliation, backup and authorized delivery while preserving API permissions. That object-storage implementation and CDN are not currently present. The port boundary prevents changing Animals/Adoptions business rules to switch providers.

### media_assets

| Field         | Purpose and updates                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------------------- |
| id            | Image UUID; never a client-selected filename/path.                                                      |
| uploadedBy    | Authenticated uploader user UUID.                                                                       |
| resourceId    | Animal or product UUID authorized by the calling feature; attachment guard validates the exact binding. |
| contentType   | image/jpeg for every stored sanitized object.                                                           |
| byteLength    | 1–2097152; matches bytes length before purge.                                                           |
| width, height | Actual encoded dimensions, 1–1600.                                                                      |
| bytes         | Private bytea sanitized image; null after deletion.                                                     |
| createdAt     | Upload/persistence timestamp.                                                                           |
| deletedAt     | Set when the owning feature removes the attachment and purges bytes.                                    |

The resource/time index supports metadata operations. User FK uses RESTRICT. Database checks enforce dimensions, content type, byte count and live/deleted byte consistency. Deletion retains metadata and original byteLength for history, not image bytes.

## Contracts and failures

`Media.prepare(bytes,mime)` returns a validated encoded image through ImageProcessor. `store(actorId,resourceId,image)` persists its metadata/bytes inside the caller's unit of work. `read(id,resourceId)` checks exact binding and undeleted content. `remove(id,resourceId,now)` clears bytes and sets deletedAt. The caller must authorize its resource; Media cannot infer another context's ownership.

Animal/product endpoints are documented in English Swagger and [Animals](animals.md) and [Catalog](catalog.md). There is no presigned/direct upload or arbitrary remote URL ingestion, so no remote fetch/SSRF path is introduced. No malware scanning service or moderation of image subject matter is claimed; publication moderation remains an explicit administrative decision.

## Verification

Tests use real Sharp to verify reencoding, dimension limits, MIME mismatch and metadata removal. HTTP tests cover bad SVG/text, oversized multipart, unauthorized/cross-resource reads, ten-photo cap, byte purge, detached-photo visibility and failed-audit rollback of bytes and attachments. No external storage provider is needed for these tests.

Animals/Adoptions delivery verification (2026-10-08): API/worker lint, typecheck and build, hexagonal dependency checks, 25 unit tests and 34 isolated HTTP scenarios (35 test results including the suite) passed. OpenAPI export passed with 78 operations: 10 Animals and 20 Adoptions operations. Tests used temporary dedicated infrastructure.

Animals/Adoptions deployment verification: migration 007 is applied to pettly_db on shared-network; seven new tables, four guards/audit triggers and three concurrency unique indexes were checked. API and worker use the rebuilt image; API is healthy, Swagger exposes 78 operations, anonymous browsing returns 200 with no-store and private Animals access without credentials returns 401. The runtime JPEG codec was checked inside the final image. No real adoption fixtures were created by verification.

Catalog integration verification: product upload/purge use the same Media port and bounded sanitized storage. Catalog photo creation rolls back bytes/attachments when its audit fails; public delivery stops with product/business/category visibility. The combined delivery passes 32 unit tests and 40 isolated HTTP scenarios; live OpenAPI has 110 operations after migration 008.

Veterinary owns evidence attachment and owner/superadmin authorization through the public Media port. Credential upload/audit rollback includes stored bytes; explicit evidence removal purges bytes. PDF/original document files are unsupported, and no public route exposes professional evidence. See [Veterinary](veterinary.md).
