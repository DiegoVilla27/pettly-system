# Veterinary accreditation

Updated: 2026-10-09. Implemented private accreditation review and clinical eligibility for Colombian veterinary appointment services. Swagger: http://localhost:3100/api/docs, tag Veterinary accreditation.

## Purpose and professional verification

The feature owns professional accreditation evidence, independent review, recheck deadlines and revocation. Services owns service publication/calendars; Bookings owns accepted appointments. It does not implement diagnoses, clinical records, prescriptions, controlled-drug permits, facility licensing or automatic government verification.

The Colombian Council describes professional qualification plus its register/professional card as requirements for practice, and publishes an official means of obtaining a standing certificate. See [official requirements](https://consejoprofesionalmvz.gov.co/preguntas-frecuentes-tramites) and [standing certificate](https://consejoprofesionalmvz.gov.co/certificado-de-vigencia), consulted 2026-10-09. Pettly accepts veterinarian or veterinarian_zootechnician qualifications for clinical bookings; a zootechnician-only qualification is insufficient for this feature.

A document upload never proves legal authorization. An independent global superadmin must manually compare professional identity, qualification, registration and current habilitation with the official register/certificate, attest officialRegisterChecked=true and record a verificationReference and reason. No website scraping, external request or fabricated validation result occurs. The reviewer must set verifiedUntil within 90 days: this is a Pettly recheck-freshness policy, **not a statutory expiration of the professional license**. Shorten it when evidence/current restrictions require it. Revocation immediately stops eligibility; reviewers must respond to changes learned between checks.

## Hexagonal boundaries and access

Pure Credential aggregate enforces lifecycle/evidence/approval invariants. Application commands/queries, repository/use-case and VeterinaryEligibility ports use UsersDirectory, OrganizationAccess, ServiceResourceDirectory and Media public contracts. ServicesReadModule supplies the resource directory independently to avoid a Services → Veterinary → Services composition cycle. Nest/Prisma/Sharp/HTTP remain adapters. Distinct strict Zod request/response contracts and mappers generate English Swagger.

Only the professional owner or active verified global superadmin may read/change private credentials and images. Business administrators/operators cannot inspect another professional's evidence. Creation by superadmin requires the professional's explicit processing consent; the application records consent, it does not claim to independently authenticate that attestation. The professional must be an active verified current business_admin/business_operator member of an active Colombian business.

No new global role or automatic membership is granted. Public services expose an opaque credential UUID, not registration number, university, documents, verification references or private profile.

## Model, lifecycle and schedule

All IDs are UUIDs. Credential profile: profession, numeric registrationNumber (1–15 digits), university (2–150 characters), consent=true; immutable organizationId/professionalId/resourceId identity. Resource must belong to that business, be an active appointment resource with capacity one. One credential per resource and one registration per profession are enforced; the initial implementation associates that registration with one business schedule. Multi-business professional affiliations require extending this model and global professional occupancy protection; they are not silently supported.

State: draft → pending → approved/rejected; superadmin may revoke. Pending evidence is frozen. Correcting a profile, adding/removing documents or submitting again withdraws approval and requires fresh review. Version increments on every mutation; stale expectedVersion returns 409. Approved remains a historical state after verifiedUntil passes, but is no longer eligible. No scheduler is needed to enforce expiration.

Evidence requires professional_card, qualification and standing_certificate categories; up to six sanitized image pages. Multipart one file ≤5 MiB, three text fields, JPEG/PNG/WebP single-frame input. Existing Media decodes with a 20 MP limit, strips supplied metadata and stores bounded sanitized JPEG ≤2 MiB/1600×1600. PDF, arbitrary URLs and original files are unsupported. Private no-store reads recheck ownership and exact attachment. Removal clears Media bytes and preserves audit metadata. Image processing/attachment/revision/audit share one database transaction; any failure rolls back all writes.

Veterinary Service requires kind=appointment, veterinaryCredentialId and exactly that credential's resource. Existing resource capacity and buffers prevent duplicate clinical allocations. Configure/submit/approve and public detail/search/availability/new booking recheck current professional eligibility. Availability excludes appointments ending at/after the recheck deadline; booking repeats the check under transaction locks. Accepted booking policy retains category and credential UUID; legacy snapshots without those fields remain readable. Confirm/start recheck the accepted clinical credential. Cancellation/completion/history remain possible after revocation; no accepted appointment is silently deleted or rewritten. Provider must explicitly handle affected upcoming patients. Service pause/archive remains possible with a revoked credential.

## Persistence and constraints

Migration 013 adds veterinary_credentials and veterinary_credential_audit. Credentials project owner/professional/resource, profession/registration, status/version/deadline and timestamps; JSON snapshot holds profile, evidence references and review metadata. Audit stores UUID, credential/actor, action/version, exact snapshot, reason/request ID and timestamp. Neither audit nor credentials can be physically deleted through the application.

FKs protect identities/schedule/actors. SQL guards protect snapshot/projection equality, immutable identity, version continuity, complete live Media bindings, independent current superadmin approval, deadline bound and matching immutable audit evidence. Clinical service/resource/booking guards back current credential binding and capacity-one scheduling even when SQL bypasses application checks. Revocation does not purge historical financial/booking evidence. See [Operations retention](operations.md).

## HTTP contracts

Prefix /api/veterinary/credentials. Active verified authenticated user required; mutations have reason, expectedVersion when updating, and strict bodies.

| Route                                      | Access and behavior                                                                        |
| ------------------------------------------ | ------------------------------------------------------------------------------------------ |
| POST /                                     | Owner or superadmin; create draft with explicit professional/business/resource/profile.    |
| PATCH /{credentialId}                      | Owner/superadmin; full profile replacement, same identity/schedule, fresh review required. |
| GET /                                      | Superadmin private paginated queue; optional organization/status filters.                  |
| GET /{credentialId}                        | Owner/superadmin metadata and evidence references.                                         |
| POST /{credentialId}/documents             | Owner/superadmin; multipart file/kind/reason/expectedVersion.                              |
| GET /{credentialId}/documents/{mediaId}    | Owner/superadmin sanitized JPEG, no-store.                                                 |
| DELETE /{credentialId}/documents/{mediaId} | Owner/superadmin; atomic detach/byte purge, pending frozen.                                |
| POST /{credentialId}/submit                | Complete mutable evidence; current professional/business eligibility.                      |
| POST /{credentialId}/review                | Independent superadmin; approve/reject, explicit official attestation/reference/deadline.  |
| POST /{credentialId}/revoke                | Superadmin; immediate clinical withdrawal.                                                 |
| GET /{credentialId}/audit                  | Owner/superadmin, bounded immutable revisions.                                             |

Queue/audit page 1–10000, limit 1–50/default20; unknown fields, invalid UUID/text/modes rejected. Reviewer may not be the professional or any member of the owning business. No automated credential notices were added; existing booking notices remain unchanged.

## Manual checks

1. Approve a Colombian business, assign a professional membership and create a capacity-one appointment resource.
2. As that professional create a credential; upload sanitized images for the three evidence categories and submit. Another account/manager cannot read its documents.
3. As independent superadmin verify against COMVEZCOL manually, then approve with attestation, reference and recheck deadline. Invalid deadline/self-review fails.
4. Create a veterinary appointment service with its credential and sole dedicated resource; submit and independently approve the service.
5. Query availability, book an owned pet and inspect accepted credential UUID. A slot after accreditation deadline is unavailable.
6. Revoke the credential: public clinical detail/new booking disappear or fail, accepted records remain. Pause service and explicitly cancel/review impacted future bookings through Bookings.
7. Confirm stale version, missing evidence, unsupported files, removed member/inactive professional and private-image ownership checks fail.

Automated unit/HTTP/SQL tests cover approval boundaries, consent/qualification, private images, complete evidence, self-review, rollback of Media on audit failure, clinical publication/allocation, immutable identity/audit and immediate withdrawal. No real professional is fabricated or approved during local deployment verification.

Verification (2026-10-09): two added unit tests within 64 passing unit tests; veterinary HTTP/SQL scenario within 63 passing real-infrastructure scenarios (64 results with suite). API/worker lint/type/build, schema/architecture and 190-operation OpenAPI validation passed. Migration 013 is applied only to pettly_db using pettly_dev; seven credential/clinical guards verified, no real credentials created. API/worker healthy. Private anonymous routes return 401; mutable review/document/booking fixtures ran only in isolated temporary infrastructure.
