export interface paths {
    "/api": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Check API availability */
        get: operations["getApiStatus"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/adoptions/moderation/publications": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read pending adoption publications for moderation
         * @description Requires current active verified moderator or super_admin. Bounded pagination ordered oldest submission first. Includes pending snapshot and review metadata; organization/animal availability is rechecked on the decision. No applicant records or private animal clinical fields.
         */
        get: operations["listAdoptionModerationQueue"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/adoptions/organizations/{organizationId}/publications": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List authorized shelter publications
         * @description Active shelter publication permission required. Bounded pagination and status filter. Includes draft/review metadata; this is a private administration endpoint.
         */
        get: operations["listManagedAdoptionPublications"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/adoptions/publications": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Browse available reviewed adoption publications
         * @description Public cursor pagination, limit 1–50. At most 200 candidates are scanned per request; continue with nextCursor until null. Current active adoption entity, active animal and at least one still-attached approved photo are checked through public ports. Private clinical notes, microchip, ownership/user contact, moderation reasons and applicant data are excluded. No payments or sales.
         */
        get: operations["listPublicAdoptions"];
        put?: never;
        /**
         * Create a shelter animal adoption draft
         * @description Requires adoptions.publications.manage in the active adoption entity owning the active animal. At most one open draft/listing per animal. No publication or role is granted automatically; submit and moderation are required.
         */
        post: operations["createAdoptionPublication"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/adoptions/publications/{publicationId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read an available reviewed adoption listing
         * @description Public safe snapshot and adoption conditions. Suspended entity, unavailable animal, unpublished listing or detached last approved photo return 404. Eligibility is read from current PostgreSQL state; no-store prevents caching stale visibility.
         */
        get: operations["getPublicAdoption"];
        put?: never;
        post?: never;
        /**
         * Archive a publication and close its open requests
         * @description Requires active shelter management and JSON reason/expectedVersion. Logical terminal archive; history preserved, all open requests closed atomically, no adoption inferred. Repeated archive is a no-op.
         */
        delete: operations["archiveAdoptionPublication"];
        options?: never;
        head?: never;
        /**
         * Edit a publication and require renewed moderation
         * @description Requires active shelter management, reason and expectedVersion. Pending/closed/deleted listings cannot be edited. Real edits return the listing to draft; its public visibility stops immediately. The approved animal snapshot is refreshed only on submission.
         */
        patch: operations["updateAdoptionPublication"];
        trace?: never;
    };
    "/api/adoptions/publications/{publicationId}/audit": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read the authorized adoption decision history
         * @description Active shelter publication management required. Bounded paginated immutable lifecycle/request events, UUIDs, reason and HTTP correlation; no applicant contact or photo bytes.
         */
        get: operations["listAdoptionAudit"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/adoptions/publications/{publicationId}/manage": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read an authorized private publication
         * @description Requires publication management permission in the active owning adoption entity, or current global moderator/super_admin for administrative inspection. Public reads use the separate public detail endpoint.
         */
        get: operations["getManagedAdoptionPublication"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/adoptions/publications/{publicationId}/manage/photos/{mediaId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Preview a private adoption snapshot photograph
         * @description Requires an active verified global moderator/super_admin or authorized shelter publication manager. Available before publication. The entity and animal must remain active, and the exact photo must belong to both the submitted snapshot and current animal attachments. No clinical data or arbitrary media access. Detached/unavailable photos return 404; authenticated JPEG responses use no-store.
         */
        get: operations["getManagedAdoptionPhoto"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/adoptions/publications/{publicationId}/pause": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Pause an available adoption listing
         * @description Requires active shelter management. Paused listings stop public reads and new requests immediately. Resume requires resubmission and explicit moderation. Reason and expectedVersion required; stale writes return 409.
         */
        post: operations["pauseAdoptionPublication"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/adoptions/publications/{publicationId}/photos/{mediaId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read a sanitized photo attached to an available listing
         * @description Public access only while the listing, animal and entity are currently eligible and this exact photo remains in the approved snapshot and current attachment list. Storage is private; no-store JPEG response.
         */
        get: operations["getPublicAdoptionPhoto"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/adoptions/publications/{publicationId}/requests": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List applications for an authorized shelter publication
         * @description Requires adoptions.requests.review in the active owning entity. Bounded pagination and status filters. Contact is read through the separately authorized individual request detail, not copied into list results.
         */
        get: operations["listShelterAdoptionRequests"];
        put?: never;
        /**
         * Apply for adoption with explicit contact consent
         * @description Requires active verified customer and current phone/country/city profile. Published eligible listing only; organization members cannot apply to their own shelter. Consent=true accepts conditions and sharing current contact with that entity. One open request per applicant/listing; no checkout or automatic approval.
         */
        post: operations["submitAdoptionRequest"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/adoptions/publications/{publicationId}/review": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Moderate a pending adoption publication
         * @description Requires current moderator or super_admin global moderation permission, active entity/animal and an attached approved photo. Publication creators and members of its entity cannot moderate their own listing. Explicit approved boolean, reason and expectedVersion required; review and audit are atomic.
         */
        post: operations["reviewAdoptionPublication"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/adoptions/publications/{publicationId}/submit": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Submit a publication for moderation
         * @description Requires active shelter management, active animal and at least one sanitized attached photo. Draft/rejected/paused only; captures a safe animal snapshot. Reason and expectedVersion required; stale writes return 409.
         */
        post: operations["submitAdoptionPublication"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/adoptions/requests/{adoptionRequestId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read your application or an authorized shelter request
         * @description Only applicant or current shelter reviewer. Contact is fetched from the public UsersDirectory port; account anonymization yields contact=null. No address, birth date, credentials or other requests are exposed.
         */
        get: operations["getAdoptionRequest"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/adoptions/requests/{adoptionRequestId}/complete": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Explicitly confirm a completed adoption
         * @description Requires active shelter reviewer, approved active verified applicant and available published animal. Applicant self-confirmation is forbidden. Atomically sets request completed, listing closed and animal adopted, closes other open requests and records immutable audits. This records the shelter confirmation of handover; no sale or payment. Reason and expectedVersion are required; stale or conflicting decisions return 409.
         */
        post: operations["completeAdoptionRequest"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/adoptions/requests/{adoptionRequestId}/review": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Move an application into review, approval or rejection
         * @description Requires current active shelter review permission and available published listing. Applicants cannot review their own application. Only one approved applicant per listing. Approval requires an active verified applicant and does not mark the animal adopted. Reason and expectedVersion required.
         */
        patch: operations["reviewAdoptionRequest"];
        trace?: never;
    };
    "/api/adoptions/requests/{adoptionRequestId}/withdraw": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Withdraw your own adoption application
         * @description Only the active verified applicant. Submitted/in_review/approved applications may be withdrawn even during entity suspension; completed requests cannot. Repeated withdrawal is a no-op. Reason and expectedVersion are required; stale or conflicting decisions return 409.
         */
        post: operations["withdrawAdoptionRequest"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/adoptions/requests/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List your own adoption applications
         * @description Active verified account, bounded page/limit and status filters. Only current applicant UUID; other applicants are not returned. Own application access remains available during entity suspension.
         */
        get: operations["listMyAdoptionRequests"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/animals": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Search your animals or a permitted shelter
         * @description Defaults to current personal ownership; organizationId selects an active adoption entity with animals.manage. Bounded page/limit, name/species/status filters. Private fields require resource authorization.
         */
        get: operations["listAnimals"];
        put?: never;
        /**
         * Register a personal or shelter animal
         * @description Requires an active verified account. Personal records belong to the current user. Shelter records require animals.manage in an active adoption entity. Unknown ownership/status/role fields are rejected. Creation and audit are atomic.
         */
        post: operations["createAnimal"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/animals/{animalId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read an authorized private animal record
         * @description Requires personal ownership, superadmin personal-record access, or animals.manage in the active shelter. Includes clinical notes, identification and photo references; never use this endpoint as a public listing.
         */
        get: operations["getAnimal"];
        put?: never;
        post?: never;
        /**
         * Archive an animal without erasing historical references
         * @description Requires resource authorization and JSON reason/expectedVersion. Terminal logical archive; history and photos remain private. Repeated archive is a no-op. Listings stop being publicly available.
         */
        delete: operations["archiveAnimal"];
        options?: never;
        head?: never;
        /**
         * Update a validated animal profile
         * @description Requires current resource ownership or shelter permission, reason and expectedVersion. Stale writes return 409. Owner and organization cannot be changed. Public listings retain their approved snapshot until resubmitted.
         */
        patch: operations["updateAnimal"];
        trace?: never;
    };
    "/api/animals/{animalId}/audit": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read the authorized animal audit trail
         * @description Same private resource authorization; paginated append-only events, actor UUID, reason and request correlation. Profile values and photo bytes are not copied into audit.
         */
        get: operations["listAnimalAudit"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/animals/{animalId}/photos": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Validate and attach a sanitized animal photo
         * @description Requires resource authorization and current version. At most ten photos; file content must match the declared image type. Reencoded JPEG at most 1600px and 2 MiB, orientation normalized and metadata stripped. Photo bytes, attachment, version and audit commit atomically. 20 uploads/minute per IP.
         */
        post: operations["uploadAnimalPhoto"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/animals/{animalId}/photos/{mediaId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read an authorized private photo
         * @description Rechecks personal ownership or current active shelter permission and attachment. No public storage keys or original files are exposed; response is sanitized JPEG with no-store.
         */
        get: operations["getPrivateAnimalPhoto"];
        put?: never;
        post?: never;
        /**
         * Detach a photo and purge its stored bytes
         * @description Requires resource authorization, JSON reason and expectedVersion. Removes the attachment and photo bytes atomically. Previously approved snapshots cannot expose detached photos; a listing without any remaining approved photos becomes unavailable.
         */
        delete: operations["removeAnimalPhoto"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/animals/{animalId}/status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Record an animal as deceased
         * @description Authorized owner or shelter staff only. Deceased/adopted animals cannot be reactivated; archived records are terminal. Adoption state is set only by the explicit adoption completion workflow. Public availability checks current animal state immediately. Reason and expectedVersion required.
         */
        patch: operations["updateAnimalStatus"];
        trace?: never;
    };
    "/api/auth/accept-invitation": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Accept an invited account
         * @description Consumes a single-use 24-hour invitation token, chooses an Argon2id password and verifies the recipient email. Does not issue a session or assign roles. Sign in separately. Expired invitations can be resent by a super administrator.
         */
        post: operations["acceptInvitation"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/auth/account": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /**
         * Delete and anonymize the current account
         * @description Requires current password and reason. Permanently anonymizes profile, clears credentials/action/refresh tokens, revokes all sessions and writes immutable audit in one transaction. Historical UUID references remain. The last active verified superadministrator cannot be deleted. Deleted accounts cannot be restored.
         */
        delete: operations["deleteOwnAccount"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/auth/change-email": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Request a verified change of account email
         * @description Requires current password. Keeps the current email until a single-use 30-minute link sent to the new address is confirmed. Supersedes previous email-change tokens and notifies the current address. New address must be available; this request does not reserve it.
         */
        post: operations["requestEmailChange"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/auth/change-password": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Change the authenticated account password
         * @description Requires the current password and a different new password of 12–128 characters. Atomically changes credentials, invalidates all action tokens and pending email changes, revokes every session and schedules a security notice. Clears the web refresh cookie. Sign in again.
         */
        post: operations["changePassword"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/auth/confirm-email-change": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Confirm a new account email
         * @description Consumes the email-change token and rechecks address availability. Atomically sets the verified new email, invalidates action tokens, clears the pending address and revokes every session. Sends security notices to both addresses. A password change/reset invalidates this link.
         */
        post: operations["confirmEmailChange"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/auth/forgot-password": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Request password recovery
         * @description Always returns the same acknowledgement whether an eligible account exists or not. The email link expires in 30 minutes by default.
         */
        post: operations["forgotPassword"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/auth/login": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Sign in
         * @description Requires verified email. Web clients receive an HttpOnly SameSite=Lax cookie; mobile clients receive refreshToken in JSON.
         */
        post: operations["login"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/auth/logout": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Revoke the current session
         * @description Immediately invalidates its access and refresh tokens and clears the web refresh cookie.
         */
        post: operations["logout"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/auth/logout-all": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Revoke all account sessions */
        post: operations["logoutAll"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/auth/refresh": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Rotate a refresh token
         * @description Consumes the current refresh token and returns a new access token. Reusing a consumed token revokes its session. Session lifetime is absolute and is not extended.
         */
        post: operations["refreshSession"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/auth/register": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Register a client account
         * @description Creates an unverified account and schedules a verification email. Verify the email before signing in.
         */
        post: operations["register"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/auth/resend-verification": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Request another verification email
         * @description Uniform acknowledgement. Replaces previous verification tokens for an eligible unverified account.
         */
        post: operations["resendVerification"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/auth/reset-password": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Reset the account password
         * @description Consumes a single-use reset token, updates the password and revokes all account sessions. Does not verify an unverified email.
         */
        post: operations["resetPassword"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/auth/sessions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List active sessions owned by the current account
         * @description Paginated newest-first with a UUID tie-breaker. Includes only unexpired, unrevoked sessions and identifies the current session. Never exposes access tokens, refresh hashes or another account sessions. Page size is 1–100.
         */
        get: operations["listOwnSessions"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/auth/sessions/{sessionId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /**
         * Revoke a selected owned session
         * @description Immediately invalidates its access and refresh tokens. Other accounts session UUIDs return 404. Already revoked owned sessions are a no-op. Revoking the current session also clears the web refresh cookie.
         */
        delete: operations["revokeOwnSession"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/auth/verify-email": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Verify the account email
         * @description Consumes a single-use verification token. Verification links expire in 24 hours by default.
         */
        post: operations["verifyEmail"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/authorization/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get current global and organization access
         * @description Reads current roles and memberships from PostgreSQL. Returns only the authenticated account access; permissions are advisory for rendering controls. Each backend operation still enforces permissions, organization/resource ownership and domain transitions. Global roles and organization memberships coexist. No role is trusted from client claims or JWT snapshots.
         */
        get: operations["getCurrentUserAccess"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/authorization/roles": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List the seven role definitions and permissions
         * @description Available to authenticated accounts. Roles are fixed by the application policy; this endpoint does not grant access or permit customization. Only super_admin assigns global and organization roles. Permissions for future modules are capabilities reserved for their implementation.
         */
        get: operations["getRoleCatalog"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/authorization/users/{userId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Inspect account roles as a super administrator
         * @description Exclusive to current active verified super_admin. Returns configured global role and organization memberships for a target account, including disabled accounts, without contact/profile data. Configured permissions do not imply access for a disabled account. Returns 404 for unknown targets only after authorization.
         */
        get: operations["getUserAccessAsAdministrator"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/bookings": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Search your booking history
         * @description Buyer-only bounded pagination, status and service filters. Requested deadlines are recovered by the durable expiry scheduler within fifteen seconds; capacity checks exclude already expired requests immediately.
         */
        get: operations["listOwnBookings"];
        put?: never;
        /**
         * Reserve a reviewed service for your own pet
         * @description Active verified account, personal active pet, accepted species and current service/resource versions required. Idempotent UUID scoped to buyer; altered replay returns 409. Availability, resource capacity, blocks and pet conflicts are checked transactionally. Automatic confirmation or expiring manual request. Explicit terms/contact-sharing consent; tax-inclusive COP collected at business, no online charge.
         */
        post: operations["createBooking"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/bookings/{bookingId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read your reservation and accepted policy
         * @description Own booking only, including inactive-provider history. Expired pending requests are recovered on read; accepted policies and total are immutable unless you explicitly reschedule.
         */
        get: operations["getOwnBooking"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/bookings/{bookingId}/audit": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read your accepted booking revisions
         * @description Own booking only. Immutable reasons, actions and accepted snapshots, including prior terms after rescheduling. Private contact information never appears in public catalog responses.
         */
        get: operations["listOwnBookingAudit"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/bookings/{bookingId}/cancel": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Cancel within your accepted cancellation window
         * @description Own requested/confirmed future booking, expectedVersion and reason. Uses the policy accepted at booking time, including changes to the source service. Releases capacity and cancels queued reminders transactionally.
         */
        post: operations["cancelOwnBooking"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/bookings/{bookingId}/reschedule": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Accept a new schedule, price and policy atomically
         * @description Own requested/confirmed booking inside its existing cutoff; expected booking/service/resource versions, total, renewed consent and contact. Same service/pet, compatible resource may change. Original slot is released only when new allocation succeeds; manual services require renewed confirmation. Stable booking UUID and immutable revision history.
         */
        post: operations["rescheduleOwnBooking"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/bookings/admin": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Search bookings in your active business
         * @description Requires scoped bookings.manage, explicit organizationId and bounded pagination. Optional search matches accepted service, pet or contact names case-insensitively. Includes necessary accepted contact/pet identity for service delivery; no cross-company private reads.
         */
        get: operations["listManagedBookings"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/bookings/admin/{bookingId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read a booking for service delivery
         * @description Requires scoped bookings.manage in owning active business. Accepted policy survives service edits; pending deadlines are recovered on read.
         */
        get: operations["getManagedBooking"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/bookings/admin/{bookingId}/audit": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read the booking audit in your active business
         * @description Requires current scoped bookings.manage. Bounded immutable revisions of accepted policies, actor actions and reasons.
         */
        get: operations["listManagedBookingAudit"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/bookings/admin/{bookingId}/cancel": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Cancel a future booking as provider
         * @description Requires scoped bookings.manage, expectedVersion and reason. Requested/confirmed future bookings can be cancelled even after customer cutoff; no refund or payment is implied.
         */
        post: operations["cancelManagedBooking"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/bookings/admin/{bookingId}/complete": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Complete an attended booking
         * @description Requires scoped bookings.manage and in_progress state. Occupied interval including cleanup buffer remains reserved until its accepted end.
         */
        post: operations["completeManagedBooking"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/bookings/admin/{bookingId}/confirm": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Confirm a pending request
         * @description Requires scoped bookings.manage, expectedVersion and reason. Only pending unexpired requests can be confirmed; capacity was held during the request.
         */
        post: operations["confirmManagedBooking"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/bookings/admin/{bookingId}/no_show": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Record a missed appointment after grace
         * @description Requires scoped bookings.manage and confirmed state. At least fifteen minutes after accepted start; releases capacity without claiming payment collection.
         */
        post: operations["no_showManagedBooking"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/bookings/admin/{bookingId}/reject": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Reject a pending request
         * @description Requires scoped bookings.manage, expectedVersion and reason. Releases occupied capacity and records the provider decision.
         */
        post: operations["rejectManagedBooking"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/bookings/admin/{bookingId}/start": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Record attendance during the service window
         * @description Requires scoped bookings.manage and confirmed state. Current time must be within accepted start/end; marks in_progress.
         */
        post: operations["startManagedBooking"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/cart": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read the persistent own cart
         * @description Active verified account; creates an empty cart on first read. One business/currency, at most 50 distinct variants, quantity 1–99. Current prices are advisory; no stock reserved.
         */
        get: operations["getOwnCart"];
        put?: never;
        post?: never;
        /**
         * Clear the own cart
         * @description Requires current version; releases no stock because adding items does not reserve any.
         */
        delete: operations["clearOwnCart"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/cart/items/{variantId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * Set a cart line quantity
         * @description Requires current cart version and currently purchasable variant. Absolute quantity; one seller/currency, no automatic cart replacement. Unknown request fields are rejected.
         */
        put: operations["putOwnCartItem"];
        post?: never;
        /**
         * Remove a cart line
         * @description Requires current version; unavailable items can be removed. Removing the last item resets seller and currency.
         */
        delete: operations["removeOwnCartItem"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/catalog/admin/categories": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List the complete product taxonomy
         * @description Requires super_admin platform.settings.manage. Flat taxonomy bounded to 1000 categories; inactive and archived entries remain for history.
         */
        get: operations["listManagedCategories"];
        put?: never;
        /**
         * Create a product category
         * @description Superadmin only; globally unique lowercase slug and audited reason. No organization role grants taxonomy administration.
         */
        post: operations["createProductCategory"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/catalog/admin/categories/{categoryId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Update or disable a product category
         * @description Superadmin only, optimistic version and audit. Inactive categories immediately hide associated products; archived state is terminal and references/history remain.
         */
        patch: operations["updateProductCategory"];
        trace?: never;
    };
    "/api/catalog/admin/categories/{categoryId}/audit": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read an immutable category administration audit
         * @description Requires global platform.settings.manage (superadmin). Bounded pagination of actor/action/reason/correlation, including archived taxonomy history; business memberships cannot access platform audit.
         */
        get: operations["listCategoryAudit"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/catalog/admin/moderation/products": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List products awaiting moderation
         * @description Requires global moderator/super_admin. Bounded pagination and search/category/business/currency/price filters; pending product metadata only, without private organization profile or stock balances. Current eligibility is rechecked at review.
         */
        get: operations["listProductModerationQueue"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/catalog/admin/moderation/products/{productId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read a pending product and its variants for independent review
         * @description Global moderator/superadmin, excluding creator and all owning business members. Current pending product and active business required; includes bounded variants and photo references, without stock or private company profile. Rechecked on every read; no-store.
         */
        get: operations["getProductReviewPreview"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/catalog/admin/moderation/products/{productId}/photos/{mediaId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read a sanitized photo during independent product review
         * @description Independent global moderator/superadmin only, excluding creator/business members. Current pending product, active business and exact attachment required. Authenticated JPEG bytes and no-store; no storage paths or originals.
         */
        get: operations["getProductReviewPhoto"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/catalog/admin/products": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Search products in your business
         * @description Requires catalog.manage in an active business including superadmin. Explicit organization UUID, bounded pagination and status/search filters. No cross-company reads.
         */
        get: operations["listManagedProducts"];
        put?: never;
        /**
         * Create a business product draft
         * @description Requires catalog.manage in the explicit active business. Currency is immutable COP/USD/EUR; category must be active. No automatic publication or initial stock.
         */
        post: operations["createCatalogProduct"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/catalog/admin/products/{productId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read a managed product with variants and photos
         * @description Requires current catalog.manage in the owning active business. Includes private lifecycle/reviewer metadata and archived variants.
         */
        get: operations["getManagedProduct"];
        put?: never;
        post?: never;
        /**
         * Archive a product permanently
         * @description Requires owning active business permission, expectedVersion and reason. Terminal archive preserves variants, inventory, holds and audit history; active holds can be released or expire.
         */
        delete: operations["archiveCatalogProduct"];
        options?: never;
        head?: never;
        /**
         * Update a product and request renewed review
         * @description Requires owning business permission and expectedVersion. Real changes remove public visibility; pending/archived products cannot be edited. UUID ownership/currency/status cannot be injected.
         */
        patch: operations["updateCatalogProduct"];
        trace?: never;
    };
    "/api/catalog/admin/products/{productId}/audit": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read the immutable product audit trail
         * @description Owning catalog.manage and bounded pagination. Audit events contain actor UUID, action, reason and correlation; stock movements have their own Inventory endpoint.
         */
        get: operations["listProductAudit"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/catalog/admin/products/{productId}/pause": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Pause a published product
         * @description Requires owning business permission and current published state. Immediately removes public visibility; resume requires submission and moderation.
         */
        post: operations["pauseCatalogProduct"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/catalog/admin/products/{productId}/photos": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Upload a sanitized product photo
         * @description Owning catalog.manage, expected product version and reason. One JPEG/PNG/WebP up to 5 MiB, at most ten photos. Metadata stripped; output bounded JPEG. Bytes, attachment, product version and audit commit atomically; product returns to draft.
         */
        post: operations["uploadProductPhoto"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/catalog/admin/products/{productId}/photos/{mediaId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read an authorized private product photo
         * @description Owning catalog.manage and exact product attachment required. Sanitized JPEG with no-store; original filenames/storage paths are never exposed.
         */
        get: operations["getManagedProductPhoto"];
        put?: never;
        post?: never;
        /**
         * Detach and purge a product photo
         * @description Owning catalog.manage, reason and expectedVersion. Attachment/bytes/version/audit are transactional; real changes withdraw publication. Pending/archived products cannot be edited.
         */
        delete: operations["removeProductPhoto"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/catalog/admin/products/{productId}/review": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Review a submitted product
         * @description Requires global moderator or super_admin outside the owning organization, active business, pending status and expectedVersion. Creator/members cannot self-review. Approved products become public only while eligibility remains current.
         */
        post: operations["reviewCatalogProduct"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/catalog/admin/products/{productId}/submit": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Submit a product for moderation
         * @description Requires owning business permission, active category, at least one active variant and one sanitized photo. Draft/rejected/paused to pending. Optimistic version and audit.
         */
        post: operations["submitCatalogProduct"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/catalog/admin/products/{productId}/variants": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Create a product variant
         * @description Requires owning catalog.manage; SKU normalized uppercase and unique within company including archived entries. Maximum fifty variants per product, ten bounded attributes and integer minor-unit prices. Variant changes withdraw publication and require renewed review; stock remains owned by Inventory.
         */
        post: operations["createProductVariant"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/catalog/admin/products/{productId}/variants/{variantId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /**
         * Archive a product variant permanently
         * @description Requires owning catalog.manage; SKU normalized uppercase and unique within company including archived entries. Maximum fifty variants per product, ten bounded attributes and integer minor-unit prices. Variant changes withdraw publication and require renewed review; stock remains owned by Inventory.
         */
        delete: operations["archiveProductVariant"];
        options?: never;
        head?: never;
        /**
         * Update an existing product variant
         * @description Requires owning catalog.manage; SKU normalized uppercase and unique within company including archived entries. Maximum fifty variants per product, ten bounded attributes and integer minor-unit prices. Variant changes withdraw publication and require renewed review; stock remains owned by Inventory.
         */
        patch: operations["updateProductVariant"];
        trace?: never;
    };
    "/api/catalog/categories": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List active product categories
         * @description Public flat taxonomy; inactive/archived categories are excluded. No-store responses reflect current state.
         */
        get: operations["listPublicCategories"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/catalog/products": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Search reviewed products from active businesses
         * @description Bounded page/limit, name, category, business, brand and minor-unit price/currency filters. Current organization/category state is checked through public ports. Filtered pages may be short; continue nextPage until null. No eligible total is claimed; stock availability uses Inventory.
         */
        get: operations["listPublicProducts"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/catalog/products/{productId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read a currently available reviewed product
         * @description Inactive business/category or unpublished product returns 404. Prices are minor units, not final checkout totals; shipping/taxes/orders are not implemented. Review identities/reasons are excluded.
         */
        get: operations["getPublicProduct"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/catalog/products/{productId}/photos/{mediaId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read a sanitized public product photo
         * @description Checks current published product, active business/category and exact attachment. Private storage; JPEG without EXIF and no-store.
         */
        get: operations["getPublicProductPhoto"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/checkout/quotes": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Quote the current cart
         * @description Own current nonempty cart; revalidates publication, business, category, price, delivery coverage, explicit taxes and available stock. Immutable quote expires in five minutes; creates no reservation. Colombia/COP only. Includes immutable commission allocation; changing commission requires a new quote. All amounts are safe integer minor units.
         */
        post: operations["createCheckoutQuote"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/checkout/quotes/{quoteId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read an own immutable quote
         * @description Only the authenticated buyer. Contains the accepted products, contact, delivery/tax costs, terms and expiry. Reading does not extend validity.
         */
        get: operations["getOwnCheckoutQuote"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/health/live": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Check process liveness without external dependencies */
        get: operations["getApiLiveness"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/health/ready": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Check database and Redis readiness
         * @description No authentication, no route limiter dependency, no hostnames/secrets. Returns 503 when a required dependency fails. SMTP and payment-provider activation are separate business/delivery concerns.
         */
        get: operations["getApiReadiness"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/inventory/availability": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read current available quantities
         * @description At most fifty comma-separated variant UUIDs; only currently published active business/category/product variants are returned. Available = physical stock minus unexpired holds. This read is advisory; no-store, no reservation guarantee and no private stock ledger.
         */
        get: operations["getPublicInventoryAvailability"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/inventory/holds/{holdId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read a business reservation
         * @description Owning active-business inventory permission. Expired holds are released before reading; customers and other businesses cannot inspect internal references.
         */
        get: operations["getManagedInventoryHold"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/inventory/holds/{holdId}/consume": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Consume a stock reservation
         * @description Owning inventory.manage, expected stock version and idempotency UUID. Release frees reserved units even after product archival; consume requires an unexpired active hold and published eligible variant and reduces physical and reserved stock together. Terminal holds cannot be processed twice. This operation does not record payment or create an order.
         */
        post: operations["consumeInventoryHold"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/inventory/holds/{holdId}/release": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Release a stock reservation
         * @description Owning inventory.manage, expected stock version and idempotency UUID. Release frees reserved units even after product archival; consume requires an unexpired active hold and published eligible variant and reduces physical and reserved stock together. Terminal holds cannot be processed twice. This operation does not record payment or create an order.
         */
        post: operations["releaseInventoryHold"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/inventory/variants": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List private variant stock by business
         * @description Requires inventory.manage in the exact owning active business. Bounded server pagination and case-insensitive SKU/product search; optional active/archived variant filter. Includes historical product states and virtual zero balances. Reads balances and active holds in batches; releases due holds with immutable ledger entries transactionally before returning physical, reserved and available quantities. Versions are advisory until refreshed for a command; no stock reservation guarantee.
         */
        get: operations["listManagedInventory"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/inventory/variants/{variantId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read a variant stock balance
         * @description Requires inventory.manage in owning active business. Physical/reserved/available quantities and version; expired reservations are released transactionally before read. New variants have zero stock at version one.
         */
        get: operations["getManagedStock"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/inventory/variants/{variantId}/holds": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Reserve currently available variant units
         * @description Business operation requires owning inventory.manage and currently published eligible variant. Persisted deadline within thirty minutes, reference UUID, reason, expectedVersion and idempotency UUID. Maximum 1000 active holds per variant. This is not a customer checkout or an implemented order/payment.
         */
        post: operations["createInventoryHold"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/inventory/variants/{variantId}/movements": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read the immutable stock ledger
         * @description Requires owning inventory.manage; bounded page/limit. Includes receipts, issues, signed adjustments, reservations, release, consumption and system expiry with resulting balances and correlation.
         */
        get: operations["listInventoryMovements"];
        put?: never;
        /**
         * Receive, issue or adjust physical stock
         * @description Requires owning inventory.manage, reason, expectedVersion and durable idempotency UUID. Receipt/issue positive quantity, adjustment signed delta. Reserved stock cannot be issued; balances remain nonnegative. Movement audit failure rolls back stock. Identical retry has no duplicate effects.
         */
        post: operations["recordInventoryMovement"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/metrics": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read bounded Prometheus operational metrics
         * @description Dedicated Bearer METRICS_TOKEN required, independent of user JWT. Disabled with 503 unless configured. No addresses, query strings, bodies, tokens or concrete resource IDs in labels. HTTP latency/errors, process, notification backlog/failures and worker heartbeat; private network/loopback collection recommended.
         */
        get: operations["getOperationalMetrics"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/notifications": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read your persistent notification inbox
         * @description Active verified account; strictly current recipient, including superadmin. Bounded pagination/category/unread filters. Historical informational event, not an authorization grant or current subject state; original module permissions still apply.
         */
        get: operations["listOwnNotifications"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/notifications/{notificationId}/read": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Mark one of your notifications as read
         * @description Strict empty body. Unknown/foreign recipient UUID returns 404. Replays preserve the original readAt; no read-to-unread mutation or physical deletion.
         */
        post: operations["readOwnNotification"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/notifications/admin/deliveries/{deliveryId}/retry": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Create an audited fresh attempt for a failed business email
         * @description Superadmin and 10–500 character reason. Only delivery_failed, unexpired inbox-backed mail, current active verified recipient and enabled category. New outbox/job UUID, stable parent uniqueness, original deadline and informational content; repeated requests return the same child. Tokens, expired, superseded and preference-canceled mail must not be replayed. No provider send inside HTTP transaction.
         */
        post: operations["retryFailedNotificationDelivery"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/notifications/admin/failed-deliveries": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Inspect safe failed-delivery metadata as superadmin
         * @description Global superadmin only. Bounded metadata including failure category, deadline and retry parent. Excludes recipient addresses, encrypted payloads, tokens and provider exception bodies. Auth/legacy/canceled/expired messages may be listed but are not retryable.
         */
        get: operations["listFailedNotificationDeliveries"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/notifications/preferences": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read your optional email preferences
         * @description Orders/adoptions/bookings email defaults enabled. Virtual version zero until first save; organization access/security mail and in-app records remain mandatory. Auth token/security mail is independent.
         */
        get: operations["getOwnNotificationPreferences"];
        /**
         * Update optional email categories optimistically
         * @description All three optional booleans and expectedVersion required. Stale version returns 409. Disabling cancels unsent matching notification emails/reminders; records remain in-app. Re-enabling affects future events, without replaying canceled historical mail. An SMTP send already in progress may arrive.
         */
        put: operations["changeOwnNotificationPreferences"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/notifications/read-all": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Mark your existing inbox events as read up to a cutoff
         * @description UTC through timestamp at or before now. Newer arrivals remain unread. Single database update, recipient scoped and idempotent; no email delivery effect.
         */
        post: operations["readAllOwnNotifications"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/notifications/unread-count": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Count your unread inbox events
         * @description Recipient-only current database count. No Redis cache or foreign-user query parameter.
         */
        get: operations["countOwnUnreadNotifications"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/orders": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List own or managed business orders
         * @description Default scope is authenticated buyer. Explicit organizationId requires current owning active-business orders.fulfillment.manage. Bounded pagination, status and literal accepted recipient/city or exact order UUID search; contact details are never public. Deadline expiry is recovered by the scheduler and individual reads.
         */
        get: operations["listVisibleOrders"];
        put?: never;
        /**
         * Confirm a quote and reserve every order line
         * @description Explicit consent and exact total required. Quote, cart, products and terms must remain current; otherwise 409 requires a new quote. Durable buyer idempotency UUID. Creates an unpaid order, stock holds, cart clear and audit in one PostgreSQL transaction; unpaid orders expire in thirty minutes. No charge is made.
         */
        post: operations["createOwnOrder"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/orders/{orderId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read an order and its immutable snapshot
         * @description Only the buyer or owning active-business fulfillment staff/superadmin. Buyer retains own history when the seller is suspended. Expired unpaid orders release reservations transactionally.
         */
        get: operations["getVisibleOrder"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/orders/{orderId}/audits": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read immutable order history
         * @description Buyer or owning active-business fulfillment staff; bounded pagination. Automatic expiry and trusted payment confirmation use null system actors.
         */
        get: operations["listVisibleOrderAudits"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/orders/{orderId}/cancel": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Cancel an unpaid pending order
         * @description Buyer or owning active-business fulfillment staff. Current version and audited reason; releases every reservation atomically. Paid orders require a future refund workflow and return 409.
         */
        post: operations["cancelUnpaidOrder"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/orders/{orderId}/fulfillment": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Advance paid order fulfillment
         * @description Owning active-business orders.fulfillment.manage. Version and audited reason. Only paid → preparing → dispatched (delivery) or ready_for_pickup (pickup) → delivered. Payment can only be recorded through the internal verified Payments port; no HTTP mark-paid endpoint exists.
         */
        patch: operations["advanceOrderFulfillment"];
        trace?: never;
    };
    "/api/orders/{orderId}/payment-attempts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Prepare an idempotent payment attempt for an own order
         * @description Active verified buyer of a live Colombian COP order with accepted commission. One unresolved attempt per order. Body accepts only a buyer-scoped idempotency UUID; identical retry returns the original attempt. Persists allocation, audit and transactional outbox; does not synchronously charge. Unconfigured provider leaves checkoutUrl null until local deadline expiry. Never authorizes a browser to mark paid.
         */
        post: operations["createOwnPaymentAttempt"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/organizations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Search organizations as a super administrator
         * @description Bounded pagination and name, legal name or registration search; filters by status, type and country. Returns basic identity without private contact or legal data.
         */
        get: operations["listOrganizations"];
        put?: never;
        /**
         * Create an organization as a super administrator
         * @description Creates the organization identity and immutable audit event atomically. Requires current active verified super_admin. No membership is granted automatically; assign one using the membership role endpoint. Creates a draft. Submission and explicit approval are required before operational permissions become available.
         */
        post: operations["createOrganization"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/organizations/{organizationId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read permitted organization identity
         * @description Requires an active verified account with membership in this organization, moderator or super_admin. Membership in a different organization grants no access. Returns basic identity only; members and customer records are not exposed.
         */
        get: operations["getOrganization"];
        put?: never;
        post?: never;
        /**
         * Archive an organization permanently
         * @description Exclusive to super_admin. Requires JSON reason and expectedVersion. Clears contact/legal profile and blocks all organization access except superadmin historical inspection. UUIDs, memberships and audit are retained. No restoration; repeating archive is a no-op.
         */
        delete: operations["archiveOrganization"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/organizations/{organizationId}/approve": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Approve an organization and appoint its responsible administrator
         * @description Exclusive to super_admin. Pending applications only. Responsible account must be active and verified. Approval and the explicit type-compatible administrator assignment are atomic. Requires reason and current expectedVersion; stale writes return HTTP 409.
         */
        post: operations["approveOrganization"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/organizations/{organizationId}/audit": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read immutable audit for an administered organization
         * @description Requires an active verified super_admin or a business_admin/adoption_admin membership in this organization. Operators, applicants without an administrator membership and members of other organizations are denied. Archived history is restricted to super_admin. Bounded pagination of lifecycle and membership decisions, actor/target UUIDs, justification, request correlation and timestamp. Profile values and credentials are never copied into audit events.
         */
        get: operations["listOrganizationAudit"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/organizations/{organizationId}/members": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List organization memberships
         * @description Restricted to super_admin and administrators of this organization. Bounded pagination; exposes membership UUID, user UUID, role and timestamps without user contact information. Only super_admin may change roles.
         */
        get: operations["listOrganizationMembers"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/organizations/{organizationId}/members/{userId}/role": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * Assign or replace an organization role as a super administrator
         * @description Exclusive to current active verified super_admin, including administrator membership assignments. Target must be active and verified. Business roles require a business; adoption roles require an adoption_entity. Unique membership per user/organization; users may belong to multiple organizations. Role changes and audit are atomic. Repeating the role is a no-op. Existing sessions remain usable and permissions are read from PostgreSQL on each authorized operation; global user role is preserved.
         */
        put: operations["assignOrganizationRole"];
        post?: never;
        /**
         * Remove an organization role as a super administrator
         * @description Requires super_admin and a JSON body with reason. Removes only this membership and appends an immutable audit event atomically. Permissions disappear on subsequent operations; other memberships and customer access remain. Already absent membership is a no-op.
         */
        delete: operations["removeOrganizationRole"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/organizations/{organizationId}/order-policy": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read business checkout settings
         * @description Owning active-business orders.settings.manage: business admin or superadmin. Null until explicitly configured; checkout remains unavailable.
         */
        get: operations["getCommercialPolicy"];
        /**
         * Configure delivery, taxes and commercial terms
         * @description Owning active-business orders.settings.manage. Audited versioned configuration; first version uses expectedVersion zero. Pickup address and/or fixed city/country delivery fees. Explicit included or added tax policy; added rates use integer basis points (100 = 1 percent). Collector records an agreement and never activates real charges.
         */
        put: operations["configureCommercialPolicy"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/organizations/{organizationId}/order-policy/audits": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read commercial policy revision history
         * @description Owning active-business orders.settings.manage; paginated immutable terms, delivery and tax snapshots with actor, reason and request correlation. Contains private pickup contact details.
         */
        get: operations["listCommercialPolicyAudits"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/organizations/{organizationId}/profile": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read private organization profile
         * @description Restricted to super_admin, organization administrators, or the applicant while draft, pending or rejected. Operators and moderators cannot read private profiles.
         */
        get: operations["getOrganizationProfile"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Update validated organization profile
         * @description Requires private profile access, reason and current expectedVersion. Non-superadmins cannot edit pending or suspended profiles. Changes to an active legal identity require renewed approval and immediately stop operational permissions. Repeating unchanged fields is a no-op.
         */
        patch: operations["updateOrganizationProfile"];
        trace?: never;
    };
    "/api/organizations/{organizationId}/reject": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Reject an organization application
         * @description Exclusive to super_admin. Pending applications only. Reason is preserved for correction and later resubmission. Requires reason and current expectedVersion; stale writes return HTTP 409.
         */
        post: operations["rejectOrganization"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/organizations/{organizationId}/responsible": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Transfer responsibility to an active verified administrator
         * @description Exclusive to super_admin. Active or suspended organizations only. Assigns the appropriate administrator membership atomically; previous administrator membership remains. Transfer first before removing or demoting the responsible administrator. Requires reason and expectedVersion.
         */
        patch: operations["transferOrganizationResponsibility"];
        trace?: never;
    };
    "/api/organizations/{organizationId}/status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Suspend or reactivate an approved organization
         * @description Exclusive to super_admin. Only active/suspended transitions are supported. Reactivation requires a complete profile and an active verified responsible administrator. Operational permissions change immediately; memberships and audit remain. Requires reason and expectedVersion.
         */
        patch: operations["updateOrganizationStatus"];
        trace?: never;
    };
    "/api/organizations/{organizationId}/submit": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Submit a complete organization for review
         * @description Draft or rejected applications only. Requires applicant or administrator access and a complete legal/contact profile. Submission grants no roles. Requires reason and current expectedVersion; stale writes return HTTP 409.
         */
        post: operations["submitOrganization"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/organizations/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List own applications and memberships
         * @description Requires an active verified account. Archived organizations are always excluded, even when status=deleted is requested. Returns basic identity only.
         */
        get: operations["listMyOrganizations"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/organizations/requests": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Start organization onboarding
         * @description Requires an active verified account. Creates a draft owned by the applicant and grants no organization roles. Unknown fields, including roles and status, are rejected.
         */
        post: operations["requestOrganization"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/payments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Search own, business or platform payment attempts
         * @description Own scope by default. organizationId requires payments.business.read in the active owning business (business admin/superadmin). scope=platform requires superadmin payments.platform.manage. Optional status and bounded page/limit. No-store; excludes idempotency internals.
         */
        get: operations["listVisiblePayments"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/payments/{paymentId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read a visible payment and its immutable allocation
         * @description Active verified buyer, owning active-business financial administrator, or superadmin with payments.platform.manage regardless of seller status. Approval and distribution are separate states; processing charges remain null until authoritatively reported. Reconciliation-required payments block replacement attempts.
         */
        get: operations["getVisiblePayment"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/payments/{paymentId}/financials": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read authoritative payment events and capture ledger
         * @description Superadmin payments.platform.manage only. Returns the latest 100 normalized provider observations and bounded capture ledger; no raw secrets, card data or private provider payload. Capture records do not prove seller distribution or order delivery.
         */
        get: operations["getPaymentFinancialEvidence"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/payments/{paymentId}/history": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read immutable payment audit history
         * @description Same buyer/business/platform financial scope as payment detail, including suspended sellers for superadmin; bounded pagination. Provider/scheduler changes have null system actor; requestId supports tracing.
         */
        get: operations["listVisiblePaymentHistory"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/payments/{paymentId}/reconcile": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Schedule an authoritative provider status lookup
         * @description Superadmin payments.platform.manage. Empty strict body. Does not accept status, money or recipient fields. Durable outbox with leases and backoff; disabled or incompatible provider returns 503. No public verified-event or mark-paid endpoint exists.
         */
        post: operations["requestPaymentReconciliation"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/payments/policy": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read the current commission and provider availability
         * @description Active verified account. PETTLY_COMMISSION_PERCENT defaults to 10; rates are copied into each accepted quote/order. Product subtotal excludes shipping and added taxes; embedded price taxes remain included. Provider disabled means no checkout or money transfer is available.
         */
        get: operations["getPaymentPolicy"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/services": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Search reviewed services from active Colombian businesses
         * @description Bounded search by organization, category or kind. Short filtered pages are possible; follow nextPage. Prices are tax-inclusive COP minor units, collected at the business. Veterinary services require a future credential workflow.
         */
        get: operations["listPublicServices"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/services/{serviceId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read a reviewed service and its accepted booking policy
         * @description Current published state and active Colombian business required; otherwise 404. Resources are referenced by UUID; UTC slots are available through the availability endpoint. No provider private contact or reviewer identity is exposed.
         */
        get: operations["getPublicService"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/services/{serviceId}/availability": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read current appointment or lodging availability
         * @description Inclusive local dates in America/Bogota, at most 31 dates within 180 days; lodging specifies nights. Up to 1000 slots with remaining capacity and total COP minor units. Advisory only: booking repeats checks under database locks. Buffers, blocks and pending requests occupy capacity.
         */
        get: operations["getServiceAvailability"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/services/{serviceId}/resources": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read selectable active resources for a reviewed service
         * @description Current published service and active Colombian business required. Resource names, kind, capacity, weekly business hours and version allow clients to choose an availability calendar. No staff account identities, private contact or reservations are exposed.
         */
        get: operations["listPublicServiceResources"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/services/admin": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Search all service states in your active business
         * @description Requires scoped services.manage; explicit organizationId, bounded pagination. No cross-company private reads.
         */
        get: operations["listManagedServices"];
        put?: never;
        /**
         * Create a Colombian business service draft
         * @description Requires services.manage in an active business. Full validated profile, assigned compatible resources, tax-inclusive COP price and explicit pay_at_business. Creation does not publish.
         */
        post: operations["createService"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/services/admin/{serviceId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read a managed service including review history
         * @description Scoped services.manage in owning active business, including archived records. Reviewer identity and reason are private.
         */
        get: operations["getManagedService"];
        put?: never;
        post?: never;
        /**
         * Archive a service permanently
         * @description Requires owning services.manage and expectedVersion. History and accepted bookings remain; archive is terminal.
         */
        delete: operations["archiveService"];
        options?: never;
        head?: never;
        /**
         * Replace service details and withdraw publication
         * @description Scoped services.manage, expectedVersion and full validated profile. Pending and archived services cannot be edited; accepted booking snapshots are preserved.
         */
        patch: operations["updateService"];
        trace?: never;
    };
    "/api/services/admin/{serviceId}/audit": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read immutable service revisions
         * @description Scoped services.manage; bounded history of actor, reason, correlation and full service snapshot.
         */
        get: operations["listServiceAudit"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/services/admin/{serviceId}/pause": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Pause a published service
         * @description Requires owning services.manage and expectedVersion. Existing accepted bookings remain; reopening requires review.
         */
        post: operations["pauseService"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/services/admin/{serviceId}/review": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Review a pending service
         * @description Requires global moderation.publications.review outside owning organization. Creator and organization members cannot self-review; current eligibility and resources are checked.
         */
        post: operations["reviewService"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/services/admin/{serviceId}/submit": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Submit a service for review
         * @description Requires owning services.manage, compatible active resources and expectedVersion. Draft, rejected or paused becomes pending.
         */
        post: operations["submitService"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/services/admin/moderation": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read pending service submissions for independent review
         * @description Requires global moderation.publications.review. Bounded pending policy snapshots without reservation/contact data. Current business/resource eligibility and self-review restrictions are rechecked when deciding.
         */
        get: operations["listServiceModerationQueue"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/services/admin/moderation/{serviceId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read a pending service policy before moderation
         * @description Global moderation.publications.review required. Pending state only; does not grant operational company access or booking details.
         */
        get: operations["getServiceReviewPreview"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/services/admin/resources": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read your business resources and calendars
         * @description Scoped services.manage. Includes active and inactive resources, bounded to 100; no buyer or booking data.
         */
        get: operations["listManagedServiceResources"];
        put?: never;
        /**
         * Create a shared service resource and weekly calendar
         * @description Requires services.manage. Capacity 1–100, maximum 100 resources per business. ISO weekday and local quarter-hour minutes; lodging uses full-day windows. Resource kind is immutable.
         */
        post: operations["createServiceResource"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/services/admin/resources/{resourceId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Change capacity, calendar or resource status safely
         * @description Scoped services.manage and expectedVersion. Changes cannot invalidate occupied future bookings; inactivation prevents new reservations while accepted bookings remain. Shared resource changes affect every assigned service.
         */
        patch: operations["updateServiceResource"];
        trace?: never;
    };
    "/api/services/admin/resources/{resourceId}/audit": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read immutable resource and calendar revisions
         * @description Requires services.manage in the owning organization. Bounded page/limit, newest first. Includes creation, profile/calendar changes, blocking and release. History is preserved; this endpoint grants no booking or customer access.
         */
        get: operations["listServiceResourceAudit"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/services/admin/resources/{resourceId}/blocks": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read active future calendar blocks
         * @description Requires scoped services.manage. UTC from/to interval within 210 days, at most 100 active future blocks per resource. Release preserves historical rows; this operational read excludes released blocks.
         */
        get: operations["listActiveServiceBlocks"];
        put?: never;
        /**
         * Block a resource for a future interval
         * @description Scoped services.manage, expected resource version, UTC interval and audited reason. Up to 210 days horizon; overlapping bookings or blocks return 409. Blocks consume all capacity.
         */
        post: operations["blockServiceResource"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/services/admin/resources/{resourceId}/blocks/{blockId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /**
         * Release a block without deleting its history
         * @description Scoped services.manage, expected resource version and audited reason. The block remains recorded and resource version increases; already released blocks return 409.
         */
        delete: operations["releaseServiceBlock"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/users": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Search and paginate accounts as a super administrator
         * @description Requires current active verified super_admin. Search matches email, given name or surname without case sensitivity. Filters include status, global role, organization role and verification. Limit is 1–100; sorting is allowlisted with a UUID tie-breaker. Credentials, tokens and MFA secrets are never returned. Deleted accounts contain anonymized identity only.
         */
        get: operations["listUsers"];
        put?: never;
        /**
         * Create an account through an email invitation
         * @description Only a current active verified super_admin may create an account. Body contains profile, email and mandatory reason, never a password or role. Creates an unverified user account with globalRole user and sends a 24-hour invitation to choose its own password. No credentials are returned. Creation, encrypted outbox and audit are atomic.
         */
        post: operations["inviteUserAsAdministrator"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/users/{userId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read an account as a super administrator
         * @description Requires current active verified super_admin. Returns profile, status and global role for the selected UUID, including inactive and anonymized accounts. No authentication secrets are exposed. Other actors are denied before target discovery.
         */
        get: operations["getUserAsAdministrator"];
        put?: never;
        post?: never;
        /**
         * Delete and anonymize an account as a super administrator
         * @description Requires current active verified super_admin and a mandatory reason. Removes personal profile and credentials, erases action/refresh tokens and revokes all sessions atomically with immutable audit. Preserves UUID historical references. Deleted accounts cannot be edited or reactivated. Repeating deletion is a no-op. The last active verified superadministrator is protected.
         */
        delete: operations["deleteUserAsAdministrator"];
        options?: never;
        head?: never;
        /**
         * Update an account profile as a super administrator
         * @description Body contains profile and mandatory audit reason. Active or disabled accounts may be updated; deleted accounts cannot be restored or edited. Email, password, verification, status and roles are not writable here: use their explicit security workflows. The update and immutable audit event commit atomically.
         */
        patch: operations["updateUserAsAdministrator"];
        trace?: never;
    };
    "/api/users/{userId}/audit": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read the immutable administration audit for an account
         * @description Requires current active verified super_admin. Paginated newest-first with UUID tie-breaker; page size 1–100. Includes actor, target, action, reason, request UUID and time; never includes passwords, tokens or historical profile values. Remains available after account deletion.
         */
        get: operations["listUserAuditAsAdministrator"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/users/{userId}/invitation": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Resend a pending account invitation
         * @description Requires current active verified super_admin and a reason. Only active unverified invited accounts without credentials qualify. Invalidates the previous invitation and sends a new 24-hour link. Delivery failure rolls back token replacement and audit.
         */
        post: operations["resendInvitationAsAdministrator"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/users/{userId}/role": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Assign a global role as a super administrator
         * @description Only a current active verified super_admin may assign user, moderator or super_admin. The target must be active and verified. Organization roles use the membership endpoint. Changes atomically revoke all target sessions and append an audit reason. Repeating the current role is a no-op. The last active superadministrator cannot be demoted. After a change the target must sign in again.
         */
        patch: operations["changeUserGlobalRole"];
        trace?: never;
    };
    "/api/users/{userId}/status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Change an account status as a super administrator
         * @description Requires a currently active, verified super_admin account. The role is read from PostgreSQL, never trusted from request fields or stale JWT claims. A state transition atomically updates the account, revokes all sessions when disabling, and records actor, target, reason and request id in the audit trail. Reactivation does not restore revoked sessions or verify email. Repeating the current state is a no-op. Disabling the last active super administrator returns 409.
         */
        patch: operations["changeUserStatus"];
        trace?: never;
    };
    "/api/users/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get the authenticated user profile
         * @description Returns the account profile and global role for the authenticated account only. Age is computed from dateOfBirth in UTC. Credentials and authentication tokens are never included.
         */
        get: operations["getCurrentUser"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Update the authenticated user profile
         * @description Partial update: omit fields to preserve them; send null to clear optional contact/address/birth-date fields. Given name and family name cannot be cleared. Empty updates and unknown fields are rejected. Email, age, status and globalRole are read-only here.
         */
        patch: operations["updateCurrentUser"];
        trace?: never;
    };
    "/api/veterinary/credentials": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Review the bounded accreditation queue as superadmin
         * @description Global superadmin only. Private identity/evidence metadata, optional organization/status filters and bounded pagination; document bytes fetched separately.
         */
        get: operations["listVeterinaryCredentials"];
        put?: never;
        /**
         * Create a private professional accreditation profile
         * @description Professional or global superadmin. Active verified professional with current business membership in Colombia, a dedicated appointment resource with capacity one and explicit consent. UUID/versioned evidence; no automatic approval.
         */
        post: operations["createVeterinaryCredential"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/veterinary/credentials/{credentialId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read authorized private accreditation metadata
         * @description Professional owner or global superadmin only; company administrators and public customers cannot read another professional’s documents.
         */
        get: operations["getVeterinaryCredential"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Correct qualification data and require fresh independent review
         * @description Professional or superadmin; identity/schedule immutable, pending evidence frozen, stale version 409. Any change withdraws approval immediately.
         */
        patch: operations["configureVeterinaryCredential"];
        trace?: never;
    };
    "/api/veterinary/credentials/{credentialId}/audit": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read authorized immutable accreditation revisions
         * @description Professional owner or superadmin. Bounded revision metadata/snapshots and administrative reasons; no document bytes or public access.
         */
        get: operations["listVeterinaryCredentialAudit"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/veterinary/credentials/{credentialId}/documents": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Upload a sanitized private document image
         * @description Authenticated professional/superadmin authorization rechecked before decoding. Single-frame JPEG/PNG/WebP only, 5 MiB input, 20 MP decode, sanitized JPEG output <=2 MiB. At most six pages; PDF/URLs unsupported. Any edit removes approval, pending review frozen. Media/audit update is atomic.
         */
        post: operations["uploadVeterinaryEvidence"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/veterinary/credentials/{credentialId}/documents/{mediaId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read an authorized sanitized accreditation image
         * @description Professional or superadmin only; exact credential attachment, image/jpeg and no-store. Does not expose arbitrary storage paths.
         */
        get: operations["readVeterinaryEvidence"];
        put?: never;
        post?: never;
        /**
         * Detach private evidence and purge its bytes atomically
         * @description Professional or superadmin; audited reason/current version. Pending evidence frozen; removal withdraws approval, retains immutable metadata audit and disables new clinical bookings.
         */
        delete: operations["removeVeterinaryEvidence"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/veterinary/credentials/{credentialId}/review": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Approve or reject evidence after manual official verification
         * @description Global superadmin only; no self/business-member review. Reviewer must attest current COMVEZCOL identity/qualification/registration/authorization check, record a verification reference and a recheck deadline within 90 days. This is Pettly review freshness, not a statutory license expiration. No external register is automatically fetched.
         */
        post: operations["reviewVeterinaryCredential"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/veterinary/credentials/{credentialId}/revoke": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Withdraw clinical eligibility immediately as superadmin
         * @description Audited current version; stops public eligibility, new bookings and clinical confirmation/start. Existing reservations remain historical and require explicit provider handling, not silent deletion.
         */
        post: operations["revokeVeterinaryCredential"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/veterinary/credentials/{credentialId}/submit": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Submit complete private evidence for independent review
         * @description Card, qualification and standing certificate images required; active professional/business membership rechecked. Upload is evidence, never automatic legal verification.
         */
        post: operations["submitVeterinaryCredential"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/veterinary/credentials/eligible": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Find currently eligible veterinary professionals for a business service
         * @description Scoped services.manage and active Colombian business required, including superadministrators. Returns only credential/professional/resource identifiers, professional display name and verification deadline. No registration, university, evidence or review reference. Current active verified professional affiliation and dedicated capacity-one appointment resource are rechecked. Paginated approved/unexpired candidates are filtered for current eligibility; candidateTotal is before this filtering. Service creation and booking independently recheck eligibility.
         */
        get: operations["listEligibleVeterinaryCredentials"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/veterinary/credentials/mine": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List the authenticated professional own private credentials
         * @description Active verified owner only; actor identity is derived from authentication. Bounded pagination and optional organization/status filters. No other professional evidence or unrestricted administrative queue.
         */
        get: operations["listOwnVeterinaryCredentials"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        AcceptInvitationRequestDto: {
            /**
             * @description Password, 12 to 128 characters; never trimmed, returned or logged.
             * @example A-long-unique-password
             */
            password: string;
            /**
             * @description Single-use 256-bit opaque action token from the email link.
             * @example AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
             */
            token: string;
        };
        AccessResponseDto: {
            /** @description Action/resource permissions. A permission does not bypass ownership, organization scope or domain state rules. Future-module permissions describe approved capabilities; their endpoints are not implemented yet. */
            globalPermissions: ("payments.self.manage" | "payments.business.read" | "payments.platform.manage" | "cart.self.manage" | "orders.settings.manage" | "profile.self.manage" | "orders.self.manage" | "bookings.self.manage" | "adoptions.self.manage" | "users.status.update" | "users.roles.manage" | "organizations.create" | "organizations.requests.manage" | "organizations.profile.read" | "organizations.review" | "organizations.status.update" | "organizations.delete" | "organizations.members.read" | "organizations.audit.read" | "organizations.members.roles.manage" | "platform.settings.manage" | "moderation.publications.review" | "reports.manage" | "organizations.read" | "organizations.profile.update" | "catalog.manage" | "inventory.manage" | "orders.fulfillment.manage" | "services.manage" | "bookings.manage" | "animals.self.manage" | "adoptions.publications.manage" | "animals.manage" | "adoptions.requests.review")[];
            /** @enum {string} */
            globalRole: "user" | "moderator" | "super_admin";
            organizations: {
                name: string;
                /** Format: uuid */
                organizationId: string;
                /** @description Action/resource permissions. A permission does not bypass ownership, organization scope or domain state rules. Future-module permissions describe approved capabilities; their endpoints are not implemented yet. */
                permissions: ("payments.self.manage" | "payments.business.read" | "payments.platform.manage" | "cart.self.manage" | "orders.settings.manage" | "profile.self.manage" | "orders.self.manage" | "bookings.self.manage" | "adoptions.self.manage" | "users.status.update" | "users.roles.manage" | "organizations.create" | "organizations.requests.manage" | "organizations.profile.read" | "organizations.review" | "organizations.status.update" | "organizations.delete" | "organizations.members.read" | "organizations.audit.read" | "organizations.members.roles.manage" | "platform.settings.manage" | "moderation.publications.review" | "reports.manage" | "organizations.read" | "organizations.profile.update" | "catalog.manage" | "inventory.manage" | "orders.fulfillment.manage" | "services.manage" | "bookings.manage" | "animals.self.manage" | "adoptions.publications.manage" | "animals.manage" | "adoptions.requests.review")[];
                /** @enum {string} */
                role: "business_admin" | "business_operator" | "adoption_admin" | "adoption_operator";
                /** @enum {string} */
                status: "draft" | "pending" | "active" | "rejected" | "suspended" | "deleted";
                /** @enum {string} */
                type: "business" | "adoption_entity";
            }[];
            /** Format: uuid */
            userId: string;
        };
        ActionTokenRequestDto: {
            /**
             * @description Single-use 256-bit opaque action token from the email link.
             * @example AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
             */
            token: string;
        };
        ActiveServiceBlocksDto: {
            items: {
                /** Format: date-time */
                createdAt: string;
                /** Format: uuid */
                createdBy: string;
                /** Format: date-time */
                endsAt: string;
                /** Format: uuid */
                id: string;
                /** Format: uuid */
                organizationId: string;
                reason: string;
                /** Format: date-time */
                releasedAt: string | null;
                /** Format: uuid */
                resourceId: string;
                /** Format: date-time */
                startsAt: string;
            }[];
        };
        AdministrationMessageResponseDto: {
            message: string;
        };
        AdminUpdateUserRequestDto: {
            profile: {
                /**
                 * @description Street address and building number.
                 * @example Calle Mayor 10
                 */
                address?: string | null;
                /**
                 * @description Optional apartment, floor or additional address information.
                 * @example Floor 2, apartment B
                 */
                addressLine2?: string | null;
                /**
                 * @description City or locality.
                 * @example Madrid
                 */
                city?: string | null;
                /**
                 * @description Uppercase ISO 3166-1 alpha-2 country code.
                 * @example ES
                 * @enum {string|null}
                 */
                countryCode?: "AD" | "AE" | "AF" | "AG" | "AI" | "AL" | "AM" | "AO" | "AQ" | "AR" | "AS" | "AT" | "AU" | "AW" | "AX" | "AZ" | "BA" | "BB" | "BD" | "BE" | "BF" | "BG" | "BH" | "BI" | "BJ" | "BL" | "BM" | "BN" | "BO" | "BQ" | "BR" | "BS" | "BT" | "BV" | "BW" | "BY" | "BZ" | "CA" | "CC" | "CD" | "CF" | "CG" | "CH" | "CI" | "CK" | "CL" | "CM" | "CN" | "CO" | "CR" | "CU" | "CV" | "CW" | "CX" | "CY" | "CZ" | "DE" | "DJ" | "DK" | "DM" | "DO" | "DZ" | "EC" | "EE" | "EG" | "EH" | "ER" | "ES" | "ET" | "FI" | "FJ" | "FK" | "FM" | "FO" | "FR" | "GA" | "GB" | "GD" | "GE" | "GF" | "GG" | "GH" | "GI" | "GL" | "GM" | "GN" | "GP" | "GQ" | "GR" | "GS" | "GT" | "GU" | "GW" | "GY" | "HK" | "HM" | "HN" | "HR" | "HT" | "HU" | "ID" | "IE" | "IL" | "IM" | "IN" | "IO" | "IQ" | "IR" | "IS" | "IT" | "JE" | "JM" | "JO" | "JP" | "KE" | "KG" | "KH" | "KI" | "KM" | "KN" | "KP" | "KR" | "KW" | "KY" | "KZ" | "LA" | "LB" | "LC" | "LI" | "LK" | "LR" | "LS" | "LT" | "LU" | "LV" | "LY" | "MA" | "MC" | "MD" | "ME" | "MF" | "MG" | "MH" | "MK" | "ML" | "MM" | "MN" | "MO" | "MP" | "MQ" | "MR" | "MS" | "MT" | "MU" | "MV" | "MW" | "MX" | "MY" | "MZ" | "NA" | "NC" | "NE" | "NF" | "NG" | "NI" | "NL" | "NO" | "NP" | "NR" | "NU" | "NZ" | "OM" | "PA" | "PE" | "PF" | "PG" | "PH" | "PK" | "PL" | "PM" | "PN" | "PR" | "PS" | "PT" | "PW" | "PY" | "QA" | "RE" | "RO" | "RS" | "RU" | "RW" | "SA" | "SB" | "SC" | "SD" | "SE" | "SG" | "SH" | "SI" | "SJ" | "SK" | "SL" | "SM" | "SN" | "SO" | "SR" | "SS" | "ST" | "SV" | "SX" | "SY" | "SZ" | "TC" | "TD" | "TF" | "TG" | "TH" | "TJ" | "TK" | "TL" | "TM" | "TN" | "TO" | "TR" | "TT" | "TV" | "TW" | "TZ" | "UA" | "UG" | "UM" | "US" | "UY" | "UZ" | "VA" | "VC" | "VE" | "VG" | "VI" | "VN" | "VU" | "WF" | "WS" | "YE" | "YT" | "ZA" | "ZM" | "ZW" | null;
                /**
                 * Format: date
                 * @description Date of birth as YYYY-MM-DD; age is calculated from this value in UTC. No future dates or ages above 120.
                 * @example 1995-06-15
                 */
                dateOfBirth?: string | null;
                /**
                 * @description Family name(s). Kept separate from given names.
                 * @example Rivera
                 */
                lastName?: string & (unknown & unknown);
                /**
                 * @description Given name(s). Unicode letters, spaces, apostrophes, periods and hyphens are supported.
                 * @example Alex
                 */
                name?: string & (unknown & unknown);
                /**
                 * @description International E.164 telephone number; formatting is checked, ownership is not verified.
                 * @example +34612345678
                 */
                phone?: string | null;
                /**
                 * @description Postal code. International formats and leading zeros are preserved.
                 * @example 28013
                 */
                postalCode?: string | null;
                /**
                 * @description State, province or administrative region.
                 * @example Comunidad de Madrid
                 */
                region?: string | null;
            };
            /**
             * @description Required administrative justification recorded in the audit trail. Avoid unnecessary personal data.
             * @example Account suspended after reviewing repeated abuse reports.
             */
            reason: string;
        };
        AdoptionAuditResponseDto: {
            items: {
                /** @enum {string} */
                action: "publication.created" | "publication.updated" | "publication.submitted" | "publication.approved" | "publication.rejected" | "publication.paused" | "publication.deleted" | "publication.closed" | "request.submitted" | "request.reviewed" | "request.withdrawn" | "request.completed" | "request.closed";
                /** Format: uuid */
                actorId: string;
                /** Format: uuid */
                correlationId: string;
                /** Format: date-time */
                createdAt: string;
                /** Format: uuid */
                id: string;
                /** Format: uuid */
                publicationId: string;
                reason: string;
                /** Format: uuid */
                requestId: string | null;
            }[];
            limit: number;
            page: number;
            total: number;
        };
        AdoptionRequestDecisionDto: {
            /** @description Current expectedVersion. Stale changes return 409. */
            expectedVersion: number;
            /** @description Decision justification retained in immutable audit. */
            reason: string;
        };
        AdoptionRequestDetailDto: {
            /** Format: uuid */
            applicantId: string;
            /** Format: date-time */
            completedAt: string | null;
            conditionsAccepted: string;
            /** Format: date-time */
            consentedAt: string;
            /** @description Current consented applicant contact. Null after account anonymization; no address, birth date or authentication data. */
            contact: {
                city: string | null;
                countryCode: string | null;
                /** Format: email */
                email: string;
                lastName: string | null;
                name: string;
                phone: string | null;
            } | null;
            /** Format: date-time */
            createdAt: string;
            /** Format: uuid */
            id: string;
            message: string;
            /** Format: uuid */
            publicationId: string;
            publicationVersion: number;
            /** Format: date-time */
            reviewedAt: string | null;
            /** Format: uuid */
            reviewedBy: string | null;
            /** @description Administrative review justification; null before review. */
            reviewReason: string | null;
            /** @enum {string} */
            status: "submitted" | "in_review" | "approved" | "rejected" | "withdrawn" | "completed" | "closed";
            /** Format: date-time */
            updatedAt: string;
            version: number;
        };
        AdoptionRequestResponseDto: {
            /** Format: uuid */
            applicantId: string;
            /** Format: date-time */
            completedAt: string | null;
            conditionsAccepted: string;
            /** Format: date-time */
            consentedAt: string;
            /** Format: date-time */
            createdAt: string;
            /** Format: uuid */
            id: string;
            message: string;
            /** Format: uuid */
            publicationId: string;
            publicationVersion: number;
            /** Format: date-time */
            reviewedAt: string | null;
            /** Format: uuid */
            reviewedBy: string | null;
            /** @description Administrative review justification; null before review. */
            reviewReason: string | null;
            /** @enum {string} */
            status: "submitted" | "in_review" | "approved" | "rejected" | "withdrawn" | "completed" | "closed";
            /** Format: date-time */
            updatedAt: string;
            version: number;
        };
        AdoptionRequestsResponseDto: {
            items: {
                /** Format: uuid */
                applicantId: string;
                /** Format: date-time */
                completedAt: string | null;
                conditionsAccepted: string;
                /** Format: date-time */
                consentedAt: string;
                /** Format: date-time */
                createdAt: string;
                /** Format: uuid */
                id: string;
                message: string;
                /** Format: uuid */
                publicationId: string;
                publicationVersion: number;
                /** Format: date-time */
                reviewedAt: string | null;
                /** Format: uuid */
                reviewedBy: string | null;
                /** @description Administrative review justification; null before review. */
                reviewReason: string | null;
                /** @enum {string} */
                status: "submitted" | "in_review" | "approved" | "rejected" | "withdrawn" | "completed" | "closed";
                /** Format: date-time */
                updatedAt: string;
                version: number;
            }[];
            limit: number;
            page: number;
            total: number;
        };
        AnimalAuditDto: {
            items: {
                /** @enum {string} */
                action: "animal.created" | "animal.updated" | "animal.status_changed" | "animal.photo_added" | "animal.photo_removed" | "animal.adopted";
                /** Format: uuid */
                actorId: string;
                /** Format: uuid */
                animalId: string;
                /** Format: date-time */
                createdAt: string;
                /** Format: uuid */
                id: string;
                reason: string;
                /** Format: uuid */
                requestId: string;
            }[];
            limit: number;
            page: number;
            total: number;
        };
        AnimalDecisionDto: {
            /** @description Current expectedVersion. Stale updates return HTTP 409. */
            expectedVersion: number;
            /**
             * @description Justification saved in immutable audit; avoid secrets and unnecessary personal information.
             * @example Animal record updated following the shelter review.
             */
            reason: string;
        };
        AnimalDetailDto: {
            /** Format: date-time */
            archivedAt: string | null;
            birthDateEstimated: boolean;
            breed: string | null;
            color: string | null;
            /** Format: date-time */
            createdAt: string;
            /** Format: date */
            dateOfBirth: string | null;
            description: string | null;
            /** @description Private clinical notes. Never included in public adoption listings. */
            healthNotes: string | null;
            /** Format: uuid */
            id: string;
            /** @description Private identification, never published in adoption listings. */
            microchip: string | null;
            name: string;
            /** @description Declared sterilization status; null means unknown. Not a veterinary certificate. */
            neutered: boolean | null;
            /** Format: uuid */
            organizationId: string | null;
            /** Format: uuid */
            ownerUserId: string | null;
            photos: {
                /** Format: uuid */
                animalId: string;
                /** Format: date-time */
                createdAt: string;
                /** Format: uuid */
                id: string;
                /** Format: uuid */
                mediaId: string;
                position: number;
            }[];
            /** @enum {string} */
            sex: "male" | "female" | "unknown";
            /** @enum {string} */
            size: "small" | "medium" | "large" | "extra_large" | "unknown";
            /** @description Publicly shareable care needs included only in the reviewed adoption snapshot. */
            specialNeeds: string | null;
            /** @enum {string} */
            species: "dog" | "cat" | "bird" | "rabbit" | "reptile" | "rodent" | "equine" | "other";
            /** @enum {string} */
            status: "active" | "adopted" | "deceased" | "archived";
            /** Format: date-time */
            updatedAt: string;
            /** @description Declared vaccination status; null means unknown. Not a veterinary certificate. */
            vaccinated: boolean | null;
            version: number;
            weightGrams: number | null;
        };
        AnimalResponseDto: {
            /** Format: date-time */
            archivedAt: string | null;
            birthDateEstimated: boolean;
            breed: string | null;
            color: string | null;
            /** Format: date-time */
            createdAt: string;
            /** Format: date */
            dateOfBirth: string | null;
            description: string | null;
            /** @description Private clinical notes. Never included in public adoption listings. */
            healthNotes: string | null;
            /** Format: uuid */
            id: string;
            /** @description Private identification, never published in adoption listings. */
            microchip: string | null;
            name: string;
            /** @description Declared sterilization status; null means unknown. Not a veterinary certificate. */
            neutered: boolean | null;
            /** Format: uuid */
            organizationId: string | null;
            /** Format: uuid */
            ownerUserId: string | null;
            /** @enum {string} */
            sex: "male" | "female" | "unknown";
            /** @enum {string} */
            size: "small" | "medium" | "large" | "extra_large" | "unknown";
            /** @description Publicly shareable care needs included only in the reviewed adoption snapshot. */
            specialNeeds: string | null;
            /** @enum {string} */
            species: "dog" | "cat" | "bird" | "rabbit" | "reptile" | "rodent" | "equine" | "other";
            /** @enum {string} */
            status: "active" | "adopted" | "deceased" | "archived";
            /** Format: date-time */
            updatedAt: string;
            /** @description Declared vaccination status; null means unknown. Not a veterinary certificate. */
            vaccinated: boolean | null;
            version: number;
            weightGrams: number | null;
        };
        AnimalsPageDto: {
            items: {
                /** Format: date-time */
                archivedAt: string | null;
                birthDateEstimated: boolean;
                breed: string | null;
                color: string | null;
                /** Format: date-time */
                createdAt: string;
                /** Format: date */
                dateOfBirth: string | null;
                description: string | null;
                /** @description Private clinical notes. Never included in public adoption listings. */
                healthNotes: string | null;
                /** Format: uuid */
                id: string;
                /** @description Private identification, never published in adoption listings. */
                microchip: string | null;
                name: string;
                /** @description Declared sterilization status; null means unknown. Not a veterinary certificate. */
                neutered: boolean | null;
                /** Format: uuid */
                organizationId: string | null;
                /** Format: uuid */
                ownerUserId: string | null;
                /** @enum {string} */
                sex: "male" | "female" | "unknown";
                /** @enum {string} */
                size: "small" | "medium" | "large" | "extra_large" | "unknown";
                /** @description Publicly shareable care needs included only in the reviewed adoption snapshot. */
                specialNeeds: string | null;
                /** @enum {string} */
                species: "dog" | "cat" | "bird" | "rabbit" | "reptile" | "rodent" | "equine" | "other";
                /** @enum {string} */
                status: "active" | "adopted" | "deceased" | "archived";
                /** Format: date-time */
                updatedAt: string;
                /** @description Declared vaccination status; null means unknown. Not a veterinary certificate. */
                vaccinated: boolean | null;
                version: number;
                weightGrams: number | null;
            }[];
            limit: number;
            page: number;
            total: number;
        };
        AnimalStatusDto: {
            /** @description Current expectedVersion. Stale updates return HTTP 409. */
            expectedVersion: number;
            /**
             * @description Justification saved in immutable audit; avoid secrets and unnecessary personal information.
             * @example Animal record updated following the shelter review.
             */
            reason: string;
            /** @enum {string} */
            status: "active" | "deceased";
        };
        ApiStatusResponseDto: {
            /**
             * @description API availability message.
             * @example Hello API
             */
            message: string;
        };
        AssignMembershipRequestDto: {
            /**
             * @description Required administrative justification stored in immutable audit records.
             * @example Organization and responsible account reviewed by administration.
             */
            reason: string;
            /**
             * @description Must match the organization type. Only super_admin assigns any membership role.
             * @example business_admin
             * @enum {string}
             */
            role: "business_admin" | "business_operator" | "adoption_admin" | "adoption_operator";
        };
        AuthResponseDto: {
            /** @description Short-lived bearer JWT. */
            accessToken: string;
            /**
             * @description Access token lifetime in seconds.
             * @example 900
             */
            expiresIn: number;
            /** @description Rotating refresh token, returned only for mobile clients. */
            refreshToken?: string;
            /** Format: uuid */
            sessionId: string;
            /** @enum {string} */
            tokenType: "Bearer";
        };
        AvailabilityResponseDto: {
            items: {
                available: number;
                /** Format: uuid */
                variantId: string;
            }[];
        };
        BlockDto: {
            /** Format: date-time */
            endsAt: string;
            /** @description Current aggregate version. Stale writes return 409. */
            expectedVersion: number;
            /** @description Audited administrative justification; exclude credentials and pet health details. */
            reason: string;
            /** Format: date-time */
            startsAt: string;
        };
        BlockResponseDto: {
            /** Format: date-time */
            createdAt: string;
            /** Format: uuid */
            createdBy: string;
            /** Format: date-time */
            endsAt: string;
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            organizationId: string;
            reason: string;
            /** Format: date-time */
            releasedAt: string | null;
            /** Format: uuid */
            resourceId: string;
            /** Format: date-time */
            startsAt: string;
        };
        BookingAuditResponseDto: {
            items: {
                action: string;
                /** Format: uuid */
                actorId: string | null;
                /** Format: uuid */
                bookingId: string;
                /** Format: date-time */
                createdAt: string;
                /** Format: uuid */
                id: string;
                reason: string;
                requestId: string;
                snapshot: {
                    [key: string]: unknown;
                };
                version: number;
            }[];
            total: number;
        };
        BookingDecisionDto: {
            expectedVersion: number;
            reason: string;
        };
        BookingResponseDto: {
            acceptance: {
                /** Format: date-time */
                acceptedAt: string;
                /** @enum {boolean} */
                consent: true;
                contact: {
                    name: string;
                    phone: string;
                };
                nights: number | null;
                organizationName: string;
                pet: {
                    /** Format: uuid */
                    id: string;
                    name: string;
                    species: string;
                };
                resource: {
                    /** Format: uuid */
                    id: string;
                    name: string;
                    version: number;
                };
                service: {
                    bufferAfterMinutes: number;
                    bufferBeforeMinutes: number;
                    cancellationCutoffMinutes: number;
                    category?: string;
                    checkInMinute: number | null;
                    checkOutMinute: number | null;
                    /** @enum {string} */
                    collectionMode: "pay_at_business";
                    /** @enum {string} */
                    confirmationMode: "automatic" | "manual";
                    /** @enum {string} */
                    currency: "COP";
                    durationMinutes: number | null;
                    /** @enum {string} */
                    kind: "appointment" | "lodging";
                    maxNights: number;
                    minimumNoticeMinutes: number;
                    minNights: number;
                    name: string;
                    priceMinor: number;
                    requestTtlMinutes: number;
                    requirements: string;
                    terms: string;
                    version: number;
                    /** Format: uuid */
                    veterinaryCredentialId?: string | null;
                };
                slot: {
                    /** @enum {string} */
                    kind: "appointment";
                    /** Format: date-time */
                    startsAt: string;
                } | {
                    /** Format: date */
                    endDate: string;
                    /** @enum {string} */
                    kind: "lodging";
                    /** Format: date */
                    startDate: string;
                };
                /** @enum {string} */
                timeZone: "America/Bogota";
                totalMinor: number;
            };
            /** Format: uuid */
            animalId: string;
            /** Format: uuid */
            buyerId: string;
            /** Format: date-time */
            createdAt: string;
            /** Format: date-time */
            endsAt: string;
            /** Format: date-time */
            expiresAt: string | null;
            /** Format: uuid */
            id: string;
            /** Format: date-time */
            occupiedEndsAt: string;
            /** Format: date-time */
            occupiedStartsAt: string;
            /** Format: uuid */
            organizationId: string;
            /** Format: uuid */
            resourceId: string;
            /** Format: uuid */
            serviceId: string;
            /** Format: date-time */
            startsAt: string;
            /** @enum {string} */
            status: "requested" | "confirmed" | "in_progress" | "completed" | "cancelled" | "rejected" | "expired" | "no_show";
            /** Format: date-time */
            updatedAt: string;
            version: number;
        };
        BookingsResponseDto: {
            items: {
                acceptance: {
                    /** Format: date-time */
                    acceptedAt: string;
                    /** @enum {boolean} */
                    consent: true;
                    contact: {
                        name: string;
                        phone: string;
                    };
                    nights: number | null;
                    organizationName: string;
                    pet: {
                        /** Format: uuid */
                        id: string;
                        name: string;
                        species: string;
                    };
                    resource: {
                        /** Format: uuid */
                        id: string;
                        name: string;
                        version: number;
                    };
                    service: {
                        bufferAfterMinutes: number;
                        bufferBeforeMinutes: number;
                        cancellationCutoffMinutes: number;
                        category?: string;
                        checkInMinute: number | null;
                        checkOutMinute: number | null;
                        /** @enum {string} */
                        collectionMode: "pay_at_business";
                        /** @enum {string} */
                        confirmationMode: "automatic" | "manual";
                        /** @enum {string} */
                        currency: "COP";
                        durationMinutes: number | null;
                        /** @enum {string} */
                        kind: "appointment" | "lodging";
                        maxNights: number;
                        minimumNoticeMinutes: number;
                        minNights: number;
                        name: string;
                        priceMinor: number;
                        requestTtlMinutes: number;
                        requirements: string;
                        terms: string;
                        version: number;
                        /** Format: uuid */
                        veterinaryCredentialId?: string | null;
                    };
                    slot: {
                        /** @enum {string} */
                        kind: "appointment";
                        /** Format: date-time */
                        startsAt: string;
                    } | {
                        /** Format: date */
                        endDate: string;
                        /** @enum {string} */
                        kind: "lodging";
                        /** Format: date */
                        startDate: string;
                    };
                    /** @enum {string} */
                    timeZone: "America/Bogota";
                    totalMinor: number;
                };
                /** Format: uuid */
                animalId: string;
                /** Format: uuid */
                buyerId: string;
                /** Format: date-time */
                createdAt: string;
                /** Format: date-time */
                endsAt: string;
                /** Format: date-time */
                expiresAt: string | null;
                /** Format: uuid */
                id: string;
                /** Format: date-time */
                occupiedEndsAt: string;
                /** Format: date-time */
                occupiedStartsAt: string;
                /** Format: uuid */
                organizationId: string;
                /** Format: uuid */
                resourceId: string;
                /** Format: uuid */
                serviceId: string;
                /** Format: date-time */
                startsAt: string;
                /** @enum {string} */
                status: "requested" | "confirmed" | "in_progress" | "completed" | "cancelled" | "rejected" | "expired" | "no_show";
                /** Format: date-time */
                updatedAt: string;
                version: number;
            }[];
            limit: number;
            page: number;
            total: number;
        };
        CancelOrderDto: {
            expectedVersion: number;
            /** @description Mandatory audit justification. */
            reason: string;
        };
        CartResponseDto: {
            /** Format: date-time */
            createdAt: string;
            /** @enum {string|null} */
            currency: "COP" | "USD" | "EUR" | null;
            /** @description Current purchasable variant details. Unavailable cart lines remain in items but are omitted here; checkout revalidates every line. */
            current: {
                attributes: {
                    [key: string]: string;
                };
                /** @enum {string} */
                currency: "COP" | "USD" | "EUR";
                /** Format: uuid */
                id: string;
                name: string;
                /** Format: uuid */
                organizationId: string;
                priceMinor: number;
                /** Format: uuid */
                productId: string;
                productVersion: number;
                sku: string;
            }[];
            /** Format: uuid */
            id: string;
            items: {
                quantity: number;
                /** Format: uuid */
                variantId: string;
            }[];
            /** Format: uuid */
            organizationId: string | null;
            /** Format: date-time */
            updatedAt: string;
            /** Format: uuid */
            userId: string;
            version: number;
        };
        CartVersionDto: {
            /** @description Version from the current own cart. Stale commands return 409. */
            expectedVersion: number;
        };
        CatalogAuditResponseDto: {
            items: {
                action: string;
                /** Format: uuid */
                actorId: string;
                /** Format: uuid */
                categoryId: string | null;
                /** Format: date-time */
                createdAt: string;
                /** Format: uuid */
                id: string;
                /** Format: uuid */
                productId: string | null;
                reason: string;
                /** Format: uuid */
                requestId: string;
            }[];
            limit: number;
            page: number;
            total: number;
        };
        CategoriesResponseDto: {
            items: {
                /** Format: date-time */
                createdAt: string;
                description: string | null;
                /** Format: uuid */
                id: string;
                name: string;
                slug: string;
                /** @enum {string} */
                status: "active" | "inactive" | "archived";
                /** Format: date-time */
                updatedAt: string;
                version: number;
            }[];
        };
        CategoryResponseDto: {
            /** Format: date-time */
            createdAt: string;
            description: string | null;
            /** Format: uuid */
            id: string;
            name: string;
            slug: string;
            /** @enum {string} */
            status: "active" | "inactive" | "archived";
            /** Format: date-time */
            updatedAt: string;
            version: number;
        };
        ChangeEmailRequestDto: {
            /**
             * @description Unique email address; trimmed and normalized to lowercase.
             * @example alex@example.com
             */
            email: string;
            /**
             * @description Current account password. Never trimmed or returned.
             * @example A-long-unique-password
             */
            password: string;
        };
        ChangePasswordRequestDto: {
            /**
             * @description Current account password. Never trimmed or returned.
             * @example A-long-unique-password
             */
            currentPassword: string;
            /**
             * @description Password, 12 to 128 characters; never trimmed, returned or logged.
             * @example A-long-unique-password
             */
            newPassword: string;
        };
        ChangeUserRoleRequestDto: {
            /**
             * @description Required administrative justification recorded in the audit trail. Avoid unnecessary personal data.
             * @example Account suspended after reviewing repeated abuse reports.
             */
            reason: string;
            /**
             * @description Desired global role. Business and adoption roles require an organization membership.
             * @example moderator
             * @enum {string}
             */
            role: "user" | "moderator" | "super_admin";
        };
        ChangeUserStatusRequestDto: {
            /**
             * @description Required administrative justification recorded in the audit trail. Avoid unnecessary personal data.
             * @example Account suspended after reviewing repeated abuse reports.
             */
            reason: string;
            /**
             * @description Desired account state. Disabling immediately revokes every session.
             * @example disabled
             * @enum {string}
             */
            status: "active" | "disabled";
        };
        ConfigureCredentialDto: {
            expectedVersion: number;
            /** Format: uuid */
            organizationId: string;
            /** Format: uuid */
            professionalId: string;
            profile: {
                /**
                 * @description Explicit professional consent to private processing of accreditation evidence.
                 * @enum {boolean}
                 */
                consent: true;
                /** @enum {string} */
                profession: "veterinarian" | "veterinarian_zootechnician";
                /** @description COMVEZCOL registration number. Upload alone does not verify legal authorization. */
                registrationNumber: string;
                university: string;
            };
            reason: string;
            /** Format: uuid */
            resourceId: string;
        };
        ConfigurePolicyDto: {
            /**
             * @description Agreed future payment beneficiary. This configuration does not enable charges or an external payment integration.
             * @enum {string}
             */
            collector: "seller" | "platform";
            /** @enum {string} */
            currency: "COP" | "USD" | "EUR";
            enabled: boolean;
            /** @description Use zero for the first configuration, otherwise the current policy version. */
            expectedVersion: number;
            pickupAddress: {
                address: string;
                /** @default null */
                addressLine2: string | null;
                city: string;
                /**
                 * @description ISO 3166-1 alpha-2 country.
                 * @example CO
                 */
                countryCode: string;
                /**
                 * @description International E.164 contact phone.
                 * @example +573001234567
                 */
                phone: string;
                /** @default null */
                postalCode: string | null;
                recipient: string;
            } | null;
            /** @description Mandatory audit justification. */
            reason: string;
            shippingRules: {
                city: string;
                countryCode: string;
                feeMinor: number;
            }[];
            shippingTaxBasisPoints: number;
            /**
             * @description Included prices add no extra tax; added mode requires explicit basis points for every purchased variant. Pettly does not infer jurisdiction tax rates.
             * @enum {string}
             */
            taxMode: "included" | "added";
            taxRates: {
                [key: string]: number;
            };
            terms: string;
        };
        CreateAnimalDto: {
            /**
             * Format: uuid
             * @description Active adoption entity UUID. Omit to register your own personal animal.
             */
            organizationId?: string | null;
            profile: {
                /** @default false */
                birthDateEstimated: boolean;
                /** @default null */
                breed: string | null;
                /** @default null */
                color: string | null;
                /**
                 * Format: date
                 * @default null
                 */
                dateOfBirth: string | null;
                /** @default null */
                description: string | null;
                /**
                 * @description Private clinical notes. Never included in public adoption listings.
                 * @default null
                 */
                healthNotes: string | null;
                /**
                 * @description Private identification, never published in adoption listings.
                 * @default null
                 */
                microchip: string | null;
                name: string;
                /**
                 * @description Declared sterilization status; null means unknown. Not a veterinary certificate.
                 * @default null
                 */
                neutered: boolean | null;
                /**
                 * @default unknown
                 * @enum {string}
                 */
                sex: "male" | "female" | "unknown";
                /**
                 * @default unknown
                 * @enum {string}
                 */
                size: "small" | "medium" | "large" | "extra_large" | "unknown";
                /**
                 * @description Publicly shareable care needs included only in the reviewed adoption snapshot.
                 * @default null
                 */
                specialNeeds: string | null;
                /** @enum {string} */
                species: "dog" | "cat" | "bird" | "rabbit" | "reptile" | "rodent" | "equine" | "other";
                /**
                 * @description Declared vaccination status; null means unknown. Not a veterinary certificate.
                 * @default null
                 */
                vaccinated: boolean | null;
                /** @default null */
                weightGrams: number | null;
            };
            /**
             * @description Justification saved in immutable audit; avoid secrets and unnecessary personal information.
             * @example Animal record updated following the shelter review.
             */
            reason: string;
        };
        CreateBookingDto: {
            /** Format: uuid */
            animalId: string;
            /**
             * @description Explicit acceptance of the displayed service terms, price, cancellation policy and sharing contact/pet identity with the chosen provider.
             * @enum {boolean}
             */
            consent: true;
            contact: {
                name: string;
                phone: string;
            };
            expectedResourceVersion: number;
            expectedServiceVersion: number;
            expectedTotalMinor: number;
            /** Format: uuid */
            idempotencyKey: string;
            /** Format: uuid */
            resourceId: string;
            /** Format: uuid */
            serviceId: string;
            slot: {
                /** @enum {string} */
                kind: "appointment";
                /**
                 * Format: date-time
                 * @description UTC ISO timestamp, exact quarter-hour.
                 */
                startsAt: string;
            } | {
                /** Format: date */
                endDate: string;
                /** @enum {string} */
                kind: "lodging";
                /** Format: date */
                startDate: string;
            };
        };
        CreateCategoryDto: {
            /** @default null */
            description: string | null;
            name: string;
            /**
             * @description Audited justification. Do not include credentials.
             * @example Catalog updated after the supplier review.
             */
            reason: string;
            slug: string;
        };
        CreateCredentialDto: {
            /** Format: uuid */
            organizationId: string;
            /** Format: uuid */
            professionalId: string;
            profile: {
                /**
                 * @description Explicit professional consent to private processing of accreditation evidence.
                 * @enum {boolean}
                 */
                consent: true;
                /** @enum {string} */
                profession: "veterinarian" | "veterinarian_zootechnician";
                /** @description COMVEZCOL registration number. Upload alone does not verify legal authorization. */
                registrationNumber: string;
                university: string;
            };
            reason: string;
            /** Format: uuid */
            resourceId: string;
        };
        CreateHoldDto: {
            expectedVersion: number;
            /**
             * Format: date-time
             * @description UTC deadline after now and at most thirty minutes ahead.
             */
            expiresAt: string;
            /**
             * Format: uuid
             * @description Unique command UUID within this organization. Retry the identical body safely; different content returns 409.
             */
            idempotencyKey: string;
            quantity: number;
            /**
             * @description Audited operation justification.
             * @example Warehouse stock verified by the operator.
             */
            reason: string;
            /**
             * Format: uuid
             * @description Business operation reference. This is not an order or payment identifier validated by an implemented Orders module.
             */
            referenceId: string;
        };
        CreateOrderDto: {
            /**
             * @description Accept the exact quote total, products, delivery conditions and commercial terms.
             * @enum {boolean}
             */
            consent: true;
            expectedTotalMinor: number;
            /**
             * Format: uuid
             * @description Durable buyer-scoped retry key. Identical retries return the same order; different content returns 409.
             */
            idempotencyKey: string;
            /** Format: uuid */
            quoteId: string;
        };
        CreateOrganizationRequestDto: {
            /** @example Refugio Esperanza */
            name: string;
            profile?: {
                address?: string | null;
                addressLine2?: string | null;
                city?: string | null;
                /**
                 * @description ISO 3166-1 alpha-2 country; required before review and part of registration uniqueness.
                 * @example CO
                 */
                countryCode?: string | null;
                /** @description Optional public-facing organization description; plain text. */
                description?: string | null;
                /**
                 * @description Organization contact address; separate from user authentication and not email-verified by this workflow.
                 * @example contact@example.com
                 */
                email?: string | null;
                /**
                 * @description Legal organization name, required before submission. Changes require renewed approval.
                 * @example Mascotas Quindío SAS
                 */
                legalName?: string | null;
                /**
                 * @description Organization contact phone in E.164 format; SMS verification is not enabled.
                 * @example +573001234567
                 */
                phone?: string | null;
                postalCode?: string | null;
                region?: string | null;
                /**
                 * @description Registration identifier, normalized uppercase without spaces/dots/hyphens/slashes. Unique with countryCode; not a legal validity check.
                 * @example 900.123.456-7
                 */
                registrationNumber?: string | null;
                /** Format: uri */
                website?: string | null;
            };
            /**
             * @description Required administrative justification stored in immutable audit records.
             * @example Organization and responsible account reviewed by administration.
             */
            reason: string;
            /**
             * @description business for commercial providers; adoption_entity for shelters and adoption organizations.
             * @enum {string}
             */
            type: "business" | "adoption_entity";
        };
        CreatePaymentDto: {
            /**
             * Format: uuid
             * @description Durable buyer-scoped retry key. Amounts, commission, recipients and status are calculated exclusively by the server.
             */
            idempotencyKey: string;
        };
        CreateProductDto: {
            /**
             * @default COP
             * @enum {string}
             */
            currency: "COP" | "USD" | "EUR";
            /** Format: uuid */
            organizationId: string;
            profile: {
                /** @default null */
                brand: string | null;
                /** Format: uuid */
                categoryId: string;
                description: string;
                name: string;
            };
            /**
             * @description Audited justification. Do not include credentials.
             * @example Catalog updated after the supplier review.
             */
            reason: string;
        };
        CreatePublicationDto: {
            /** Format: uuid */
            animalId: string;
            profile: {
                /** @description Public locality only; street addresses are never part of the publication. */
                city: string;
                /** @description Adoption requirements shown publicly and accepted by the applicant. */
                conditions: string;
                countryCode: string;
                description: string;
                title: string;
            };
            /** @description Decision justification retained in immutable audit. */
            reason: string;
        };
        CreateResourceDto: {
            /** Format: uuid */
            organizationId: string;
            profile: {
                capacity: number;
                /** @enum {string} */
                kind: "appointment" | "lodging";
                name: string;
                /** @enum {string} */
                status: "active" | "inactive";
                windows: {
                    /** @description ISO weekday: Monday 1 through Sunday 7, in America/Bogota. */
                    day: number;
                    endMinute: number;
                    startMinute: number;
                }[];
            };
            /** @description Audited administrative justification; exclude credentials and pet health details. */
            reason: string;
        };
        CreateServiceDto: {
            /** Format: uuid */
            organizationId: string;
            profile: {
                acceptedSpecies: ("dog" | "cat" | "bird" | "rabbit" | "reptile" | "rodent" | "equine" | "other")[];
                bufferAfterMinutes: number;
                bufferBeforeMinutes: number;
                cancellationCutoffMinutes: number;
                /** @enum {string} */
                category: "grooming" | "daycare" | "training" | "lodging" | "veterinary";
                checkInMinute: number | null;
                checkOutMinute: number | null;
                /**
                 * @description Payment is collected by the business. Pettly does not charge this booking online.
                 * @enum {string}
                 */
                collectionMode: "pay_at_business";
                /** @enum {string} */
                confirmationMode: "automatic" | "manual";
                /** @enum {string} */
                currency: "COP";
                description: string;
                durationMinutes: number | null;
                /** @enum {string} */
                kind: "appointment" | "lodging";
                maxNights: number;
                minimumNoticeMinutes: number;
                minNights: number;
                name: string;
                /** @description Tax-inclusive COP minor units: 100 minor units = 1 COP. Per appointment or per night. */
                priceMinor: number;
                requestTtlMinutes: number;
                requirements: string;
                resourceIds: string[];
                terms: string;
                /**
                 * Format: uuid
                 * @description Verified professional credential UUID; required for veterinary appointment services with one dedicated resource.
                 */
                veterinaryCredentialId?: string | null;
            };
            /** @description Audited administrative justification; exclude credentials and pet health details. */
            reason: string;
        };
        CreateVariantDto: {
            /** @description Current resource version. Stale changes return 409. */
            expectedVersion: number;
            profile: {
                /** @default {} */
                attributes: {
                    [key: string]: string;
                };
                /**
                 * @description Price in currency minor units (100 minor units = 1 COP/USD/EUR). No floating-point amounts.
                 * @example 1250000
                 */
                priceMinor: number;
                sku: string;
            };
            /**
             * @description Audited justification. Do not include credentials.
             * @example Catalog updated after the supplier review.
             */
            reason: string;
        };
        CredentialAuditsDto: {
            items: {
                action: string;
                /** Format: uuid */
                actorId: string;
                /** Format: date-time */
                createdAt: string;
                /** Format: uuid */
                credentialId: string;
                /** Format: uuid */
                id: string;
                reason: string;
                requestId: string;
                snapshot: {
                    /** @enum {boolean} */
                    consent: true;
                    /** Format: date-time */
                    createdAt: string;
                    documents: {
                        /** @enum {string} */
                        kind: "professional_card" | "qualification" | "standing_certificate";
                        /** Format: uuid */
                        mediaId: string;
                    }[];
                    /** Format: uuid */
                    id: string;
                    /** Format: uuid */
                    organizationId: string;
                    /** @enum {string} */
                    profession: "veterinarian" | "veterinarian_zootechnician";
                    /** Format: uuid */
                    professionalId: string;
                    registrationNumber: string;
                    /** Format: uuid */
                    resourceId: string;
                    /** Format: date-time */
                    reviewedAt: string | null;
                    /** Format: uuid */
                    reviewedBy: string | null;
                    /** @enum {string} */
                    status: "draft" | "pending" | "approved" | "rejected" | "revoked";
                    university: string;
                    /** Format: date-time */
                    updatedAt: string;
                    verificationReference: string | null;
                    /** Format: date-time */
                    verifiedUntil: string | null;
                    version: number;
                };
                version: number;
            }[];
            total: number;
        };
        CredentialDecisionDto: {
            expectedVersion: number;
            reason: string;
        };
        CredentialResponseDto: {
            /** @enum {boolean} */
            consent: true;
            /** Format: date-time */
            createdAt: string;
            documents: {
                /** @enum {string} */
                kind: "professional_card" | "qualification" | "standing_certificate";
                /** Format: uuid */
                mediaId: string;
            }[];
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            organizationId: string;
            /** @enum {string} */
            profession: "veterinarian" | "veterinarian_zootechnician";
            /** Format: uuid */
            professionalId: string;
            registrationNumber: string;
            /** Format: uuid */
            resourceId: string;
            /** Format: date-time */
            reviewedAt: string | null;
            /** Format: uuid */
            reviewedBy: string | null;
            /** @enum {string} */
            status: "draft" | "pending" | "approved" | "rejected" | "revoked";
            university: string;
            /** Format: date-time */
            updatedAt: string;
            verificationReference: string | null;
            /** Format: date-time */
            verifiedUntil: string | null;
            version: number;
        };
        CredentialsResponseDto: {
            items: {
                /** @enum {boolean} */
                consent: true;
                /** Format: date-time */
                createdAt: string;
                documents: {
                    /** @enum {string} */
                    kind: "professional_card" | "qualification" | "standing_certificate";
                    /** Format: uuid */
                    mediaId: string;
                }[];
                /** Format: uuid */
                id: string;
                /** Format: uuid */
                organizationId: string;
                /** @enum {string} */
                profession: "veterinarian" | "veterinarian_zootechnician";
                /** Format: uuid */
                professionalId: string;
                registrationNumber: string;
                /** Format: uuid */
                resourceId: string;
                /** Format: date-time */
                reviewedAt: string | null;
                /** Format: uuid */
                reviewedBy: string | null;
                /** @enum {string} */
                status: "draft" | "pending" | "approved" | "rejected" | "revoked";
                university: string;
                /** Format: date-time */
                updatedAt: string;
                verificationReference: string | null;
                /** Format: date-time */
                verifiedUntil: string | null;
                version: number;
            }[];
            limit: number;
            page: number;
            total: number;
        };
        DecisionDto: {
            /** @description Current aggregate version. Stale writes return 409. */
            expectedVersion: number;
            /** @description Audited administrative justification; exclude credentials and pet health details. */
            reason: string;
        };
        DeleteAccountRequestDto: {
            /**
             * @description Current account password. Never trimmed or returned.
             * @example A-long-unique-password
             */
            password: string;
            /**
             * @description Reason for this operation, 10–500 characters; recorded in the immutable audit trail.
             * @example Account removed following the owner request.
             */
            reason: string;
        };
        DeleteUserRequestDto: {
            /**
             * @description Required administrative justification recorded in the audit trail. Avoid unnecessary personal data.
             * @example Account suspended after reviewing repeated abuse reports.
             */
            reason: string;
        };
        EligibleCredentialsResponseDto: {
            /** @description Number of approved, unexpired candidates before current professional/resource eligibility filtering. Items may be fewer; continue pagination to inspect subsequent candidate pages. */
            candidateTotal: number;
            items: {
                /** Format: uuid */
                id: string;
                /** Format: uuid */
                organizationId: string;
                /** Format: uuid */
                professionalId: string;
                professionalName: string;
                /** Format: uuid */
                resourceId: string;
                /** Format: date-time */
                verifiedUntil: string;
            }[];
            limit: number;
            page: number;
        };
        EmailRequestDto: {
            /**
             * @description Unique email address; trimmed and normalized to lowercase.
             * @example alex@example.com
             */
            email: string;
        };
        EmptyNotificationDto: Record<string, never>;
        ErrorResponseDto: {
            /**
             * @description Stable machine-readable error code.
             * @example INVALID_INPUT
             */
            code: string;
            /** @description Safe request field validation errors. Submitted values are never included. */
            details?: {
                field: string;
                message: string;
            }[];
            /** @description Safe English error description. */
            message: string;
            /**
             * Format: uuid
             * @description Request identifier for support.
             */
            requestId: string;
        };
        FailedNotificationDeliveriesDto: {
            items: {
                attempts: number;
                /** Format: date-time */
                createdAt: string;
                /** Format: date-time */
                deliveredAt: string | null;
                /** Format: date-time */
                expiresAt: string;
                /** Format: date-time */
                failedAt: string | null;
                failureKind: string | null;
                /** Format: uuid */
                id: string;
                mailPurpose: string | null;
                /** Format: date-time */
                notBefore: string;
                /** Format: uuid */
                notificationId: string | null;
                /** Format: uuid */
                retryOfId: string | null;
                /** Format: uuid */
                subjectId: string | null;
                subjectType: string | null;
                subjectVersion: number | null;
            }[];
            limit: number;
            page: number;
            total: number;
        };
        FulfillOrderDto: {
            expectedVersion: number;
            /** @description Mandatory audit justification. */
            reason: string;
            /** @enum {string} */
            status: "preparing" | "dispatched" | "ready_for_pickup" | "delivered";
        };
        HealthDto: {
            dependencies?: {
                database: boolean;
                redis: boolean;
            };
            /** @enum {string} */
            status: "alive" | "ready" | "unavailable";
        };
        HoldChangeResponseDto: {
            hold: {
                /** Format: date-time */
                createdAt: string;
                /** Format: date-time */
                expiresAt: string;
                /** Format: uuid */
                id: string;
                /** Format: uuid */
                orderId: string | null;
                /** Format: uuid */
                organizationId: string;
                quantity: number;
                /** Format: uuid */
                referenceId: string;
                /** @enum {string} */
                status: "active" | "released" | "consumed" | "expired";
                /** Format: date-time */
                updatedAt: string;
                /** Format: uuid */
                variantId: string;
            };
            stock: {
                available: number;
                onHand: number;
                reserved: number;
                /** Format: date-time */
                updatedAt: string;
                /** Format: uuid */
                variantId: string;
                version: number;
            };
        };
        HoldDecisionDto: {
            expectedVersion: number;
            /**
             * Format: uuid
             * @description Unique command UUID within this organization. Retry the identical body safely; different content returns 409.
             */
            idempotencyKey: string;
            /**
             * @description Audited operation justification.
             * @example Warehouse stock verified by the operator.
             */
            reason: string;
        };
        HoldResponseDto: {
            /** Format: date-time */
            createdAt: string;
            /** Format: date-time */
            expiresAt: string;
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            orderId: string | null;
            /** Format: uuid */
            organizationId: string;
            quantity: number;
            /** Format: uuid */
            referenceId: string;
            /** @enum {string} */
            status: "active" | "released" | "consumed" | "expired";
            /** Format: date-time */
            updatedAt: string;
            /** Format: uuid */
            variantId: string;
        };
        InboxNotificationDto: {
            body: string;
            /** @enum {string} */
            category: "orders" | "adoptions" | "organizations" | "bookings";
            /** Format: date-time */
            createdAt: string;
            eventType: string;
            /** Format: uuid */
            id: string;
            /** Format: date-time */
            readAt: string | null;
            status: string;
            /** Format: uuid */
            subjectId: string;
            subjectType: string;
            subjectVersion: number;
            title: string;
        };
        InboxNotificationsDto: {
            items: {
                body: string;
                /** @enum {string} */
                category: "orders" | "adoptions" | "organizations" | "bookings";
                /** Format: date-time */
                createdAt: string;
                eventType: string;
                /** Format: uuid */
                id: string;
                /** Format: date-time */
                readAt: string | null;
                status: string;
                /** Format: uuid */
                subjectId: string;
                subjectType: string;
                subjectVersion: number;
                title: string;
            }[];
            limit: number;
            page: number;
            total: number;
        };
        InventoryListResponseDto: {
            items: {
                /** Format: uuid */
                id: string;
                /** Format: uuid */
                organizationId: string;
                /** Format: uuid */
                productId: string;
                productName: string;
                /** @enum {string} */
                productStatus: "draft" | "pending" | "published" | "rejected" | "paused" | "archived";
                sku: string;
                stock: {
                    available: number;
                    onHand: number;
                    reserved: number;
                    /** Format: date-time */
                    updatedAt: string;
                    /** Format: uuid */
                    variantId: string;
                    version: number;
                };
                /** @enum {string} */
                variantStatus: "active" | "archived";
            }[];
            limit: number;
            page: number;
            total: number;
        };
        InviteUserRequestDto: {
            /**
             * @description Street address and building number.
             * @example Calle Mayor 10
             */
            address?: string | null;
            /**
             * @description Optional apartment, floor or additional address information.
             * @example Floor 2, apartment B
             */
            addressLine2?: string | null;
            /**
             * @description City or locality.
             * @example Madrid
             */
            city?: string | null;
            /**
             * @description Uppercase ISO 3166-1 alpha-2 country code.
             * @example ES
             * @enum {string|null}
             */
            countryCode?: "AD" | "AE" | "AF" | "AG" | "AI" | "AL" | "AM" | "AO" | "AQ" | "AR" | "AS" | "AT" | "AU" | "AW" | "AX" | "AZ" | "BA" | "BB" | "BD" | "BE" | "BF" | "BG" | "BH" | "BI" | "BJ" | "BL" | "BM" | "BN" | "BO" | "BQ" | "BR" | "BS" | "BT" | "BV" | "BW" | "BY" | "BZ" | "CA" | "CC" | "CD" | "CF" | "CG" | "CH" | "CI" | "CK" | "CL" | "CM" | "CN" | "CO" | "CR" | "CU" | "CV" | "CW" | "CX" | "CY" | "CZ" | "DE" | "DJ" | "DK" | "DM" | "DO" | "DZ" | "EC" | "EE" | "EG" | "EH" | "ER" | "ES" | "ET" | "FI" | "FJ" | "FK" | "FM" | "FO" | "FR" | "GA" | "GB" | "GD" | "GE" | "GF" | "GG" | "GH" | "GI" | "GL" | "GM" | "GN" | "GP" | "GQ" | "GR" | "GS" | "GT" | "GU" | "GW" | "GY" | "HK" | "HM" | "HN" | "HR" | "HT" | "HU" | "ID" | "IE" | "IL" | "IM" | "IN" | "IO" | "IQ" | "IR" | "IS" | "IT" | "JE" | "JM" | "JO" | "JP" | "KE" | "KG" | "KH" | "KI" | "KM" | "KN" | "KP" | "KR" | "KW" | "KY" | "KZ" | "LA" | "LB" | "LC" | "LI" | "LK" | "LR" | "LS" | "LT" | "LU" | "LV" | "LY" | "MA" | "MC" | "MD" | "ME" | "MF" | "MG" | "MH" | "MK" | "ML" | "MM" | "MN" | "MO" | "MP" | "MQ" | "MR" | "MS" | "MT" | "MU" | "MV" | "MW" | "MX" | "MY" | "MZ" | "NA" | "NC" | "NE" | "NF" | "NG" | "NI" | "NL" | "NO" | "NP" | "NR" | "NU" | "NZ" | "OM" | "PA" | "PE" | "PF" | "PG" | "PH" | "PK" | "PL" | "PM" | "PN" | "PR" | "PS" | "PT" | "PW" | "PY" | "QA" | "RE" | "RO" | "RS" | "RU" | "RW" | "SA" | "SB" | "SC" | "SD" | "SE" | "SG" | "SH" | "SI" | "SJ" | "SK" | "SL" | "SM" | "SN" | "SO" | "SR" | "SS" | "ST" | "SV" | "SX" | "SY" | "SZ" | "TC" | "TD" | "TF" | "TG" | "TH" | "TJ" | "TK" | "TL" | "TM" | "TN" | "TO" | "TR" | "TT" | "TV" | "TW" | "TZ" | "UA" | "UG" | "UM" | "US" | "UY" | "UZ" | "VA" | "VC" | "VE" | "VG" | "VI" | "VN" | "VU" | "WF" | "WS" | "YE" | "YT" | "ZA" | "ZM" | "ZW" | null;
            /**
             * Format: date
             * @description Date of birth as YYYY-MM-DD; age is calculated from this value in UTC. No future dates or ages above 120.
             * @example 1995-06-15
             */
            dateOfBirth?: string | null;
            email: string;
            /**
             * @description Family name(s). Kept separate from given names.
             * @example Rivera
             */
            lastName: unknown & unknown;
            /**
             * @description Given name(s). Unicode letters, spaces, apostrophes, periods and hyphens are supported.
             * @example Alex
             */
            name: unknown & unknown;
            /**
             * @description International E.164 telephone number; formatting is checked, ownership is not verified.
             * @example +34612345678
             */
            phone?: string | null;
            /**
             * @description Postal code. International formats and leading zeros are preserved.
             * @example 28013
             */
            postalCode?: string | null;
            /**
             * @description Required administrative justification recorded in the audit trail. Avoid unnecessary personal data.
             * @example Account suspended after reviewing repeated abuse reports.
             */
            reason: string;
            /**
             * @description State, province or administrative region.
             * @example Comunidad de Madrid
             */
            region?: string | null;
        };
        LoginRequestDto: {
            /**
             * @description Defaults to web (HttpOnly refresh cookie). Mobile receives refreshToken in JSON.
             * @default web
             * @enum {string}
             */
            client: "web" | "mobile";
            /**
             * @description Unique email address; trimmed and normalized to lowercase.
             * @example alex@example.com
             */
            email: string;
            /**
             * @description Account password.
             * @example A-long-unique-password
             */
            password: string;
        };
        ManagedServicesDto: {
            items: {
                acceptedSpecies: ("dog" | "cat" | "bird" | "rabbit" | "reptile" | "rodent" | "equine" | "other")[];
                bufferAfterMinutes: number;
                bufferBeforeMinutes: number;
                cancellationCutoffMinutes: number;
                /** @enum {string} */
                category: "grooming" | "daycare" | "training" | "lodging" | "veterinary";
                checkInMinute: number | null;
                checkOutMinute: number | null;
                /** @enum {string} */
                collectionMode: "pay_at_business";
                /** @enum {string} */
                confirmationMode: "automatic" | "manual";
                /** Format: date-time */
                createdAt: string;
                /** Format: uuid */
                createdBy: string;
                /** @enum {string} */
                currency: "COP";
                description: string;
                durationMinutes: number | null;
                /** Format: uuid */
                id: string;
                /** @enum {string} */
                kind: "appointment" | "lodging";
                maxNights: number;
                minimumNoticeMinutes: number;
                minNights: number;
                name: string;
                /** Format: uuid */
                organizationId: string;
                priceMinor: number;
                requestTtlMinutes: number;
                requirements: string;
                resourceIds: string[];
                /** Format: date-time */
                reviewedAt: string | null;
                /** Format: uuid */
                reviewedBy: string | null;
                /** @description Audited publication decision reason; null before review. */
                reviewReason: string | null;
                /** @enum {string} */
                status: "draft" | "pending" | "published" | "rejected" | "paused" | "archived";
                terms: string;
                /** @enum {string} */
                timeZone: "America/Bogota";
                /** Format: date-time */
                updatedAt: string;
                version: number;
                /** Format: uuid */
                veterinaryCredentialId: string | null;
            }[];
            limit: number;
            page: number;
            total: number;
        };
        MembershipRemovedResponseDto: {
            /** @enum {string} */
            message: "Organization role removed.";
        };
        MembershipResponseDto: {
            /** Format: date-time */
            createdAt: string;
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            organizationId: string;
            /** @enum {string} */
            role: "business_admin" | "business_operator" | "adoption_admin" | "adoption_operator";
            /** Format: date-time */
            updatedAt: string;
            /** Format: uuid */
            userId: string;
        };
        MessageResponseDto: {
            /**
             * @description English operation acknowledgement.
             * @example If the account is eligible, an email will be sent.
             */
            message: string;
        };
        ModerationProductsResponseDto: {
            items: {
                brand: string | null;
                /** Format: uuid */
                categoryId: string;
                /** Format: date-time */
                createdAt: string;
                /** Format: uuid */
                createdBy: string;
                /** @enum {string} */
                currency: "COP" | "USD" | "EUR";
                description: string;
                /** Format: uuid */
                id: string;
                name: string;
                /** Format: uuid */
                organizationId: string;
                /** Format: date-time */
                reviewedAt: string | null;
                /** Format: uuid */
                reviewedBy: string | null;
                reviewReason: string | null;
                /** @enum {string} */
                status: "draft" | "pending" | "published" | "rejected" | "paused" | "archived";
                /** Format: date-time */
                updatedAt: string;
                version: number;
            }[];
            limit: number;
            page: number;
            total: number;
        };
        MovementChangeResponseDto: {
            movement: {
                /** Format: uuid */
                actorId: string | null;
                /** Format: date-time */
                createdAt: string;
                /** Format: uuid */
                holdId: string | null;
                /** Format: uuid */
                id: string;
                idempotencyKey: string;
                /** @enum {string} */
                kind: "receipt" | "issue" | "adjustment" | "hold" | "release" | "consume" | "expire";
                onHandAfter: number;
                onHandDelta: number;
                /** Format: uuid */
                organizationId: string;
                reason: string;
                /** Format: uuid */
                requestId: string;
                reservedAfter: number;
                reservedDelta: number;
                /** Format: uuid */
                variantId: string;
                versionAfter: number;
            };
            stock: {
                available: number;
                onHand: number;
                reserved: number;
                /** Format: date-time */
                updatedAt: string;
                /** Format: uuid */
                variantId: string;
                version: number;
            };
        };
        MovementsResponseDto: {
            items: {
                /** Format: uuid */
                actorId: string | null;
                /** Format: date-time */
                createdAt: string;
                /** Format: uuid */
                holdId: string | null;
                /** Format: uuid */
                id: string;
                idempotencyKey: string;
                /** @enum {string} */
                kind: "receipt" | "issue" | "adjustment" | "hold" | "release" | "consume" | "expire";
                onHandAfter: number;
                onHandDelta: number;
                /** Format: uuid */
                organizationId: string;
                reason: string;
                /** Format: uuid */
                requestId: string;
                reservedAfter: number;
                reservedDelta: number;
                /** Format: uuid */
                variantId: string;
                versionAfter: number;
            }[];
            limit: number;
            page: number;
            total: number;
        };
        NotificationDeliveryDto: {
            attempts: number;
            /** Format: date-time */
            createdAt: string;
            /** Format: date-time */
            deliveredAt: string | null;
            /** Format: date-time */
            expiresAt: string;
            /** Format: date-time */
            failedAt: string | null;
            failureKind: string | null;
            /** Format: uuid */
            id: string;
            mailPurpose: string | null;
            /** Format: date-time */
            notBefore: string;
            /** Format: uuid */
            notificationId: string | null;
            /** Format: uuid */
            retryOfId: string | null;
            /** Format: uuid */
            subjectId: string | null;
            subjectType: string | null;
            subjectVersion: number | null;
        };
        NotificationPreferencesDto: {
            adoptionsEmail: boolean;
            bookingsEmail: boolean;
            /** @enum {boolean} */
            inAppMandatory: true;
            ordersEmail: boolean;
            /** @enum {boolean} */
            organizationEmailMandatory: true;
            /** Format: date-time */
            updatedAt: string;
            version: number;
        };
        OrderAuditsResponseDto: {
            items: {
                /** @enum {string} */
                action: "created" | "paid" | "preparing" | "dispatched" | "ready_for_pickup" | "delivered" | "cancelled" | "expired";
                /** Format: uuid */
                actorId: string | null;
                /** Format: date-time */
                createdAt: string;
                /** Format: uuid */
                id: string;
                /** Format: uuid */
                orderId: string;
                reason: string;
                /** Format: uuid */
                requestId: string;
                version: number;
            }[];
            limit: number;
            page: number;
            total: number;
        };
        OrderResponseDto: {
            /** Format: uuid */
            buyerId: string;
            /** Format: date-time */
            createdAt: string;
            /** @enum {string} */
            currency: "COP" | "USD" | "EUR";
            /** Format: date-time */
            expiresAt: string;
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            organizationId: string;
            /** Format: date-time */
            paidAt: string | null;
            /** Format: uuid */
            paymentId: string | null;
            /** Format: uuid */
            quoteId: string;
            snapshot: {
                /** @enum {string} */
                collector: "seller" | "platform";
                /** @description Immutable provider-managed split allocation before provider fees. Missing only on historical quotes/orders. Included-price taxes remain part of product subtotal. */
                commission?: {
                    /** @enum {string} */
                    base: "product_subtotal";
                    baseMinor: number;
                    platformMinor: number;
                    policyId: string;
                    /** @enum {string} */
                    processingFeeBearer: "seller";
                    rateBasisPoints: number;
                    sellerMinor: number;
                    totalMinor: number;
                };
                contact: {
                    address: string;
                    addressLine2: string | null;
                    city: string;
                    countryCode: string;
                    phone: string;
                    postalCode: string | null;
                    recipient: string;
                };
                /** @enum {string} */
                currency: "COP" | "USD" | "EUR";
                /** @enum {string} */
                fulfillment: "pickup" | "delivery";
                lines: {
                    attributes: {
                        [key: string]: string;
                    };
                    /** Format: uuid */
                    holdId: string;
                    name: string;
                    /** Format: uuid */
                    productId: string;
                    productVersion: number;
                    quantity: number;
                    sku: string;
                    subtotalMinor: number;
                    taxMinor: number;
                    unitPriceMinor: number;
                    /** Format: uuid */
                    variantId: string;
                }[];
                /** Format: uuid */
                organizationId: string;
                pickupAddress: {
                    address: string;
                    addressLine2: string | null;
                    city: string;
                    countryCode: string;
                    phone: string;
                    postalCode: string | null;
                    recipient: string;
                } | null;
                policyVersion: number;
                shippingMinor: number;
                subtotalMinor: number;
                /** @description Null when taxes are included in listed prices; otherwise explicit additional tax in minor units. */
                taxMinor: number | null;
                /** @enum {string} */
                taxMode: "included" | "added";
                terms: string;
                totalMinor: number;
            };
            /** @enum {string} */
            status: "awaiting_payment" | "paid" | "preparing" | "dispatched" | "ready_for_pickup" | "delivered" | "cancelled" | "expired";
            totalMinor: number;
            /** Format: date-time */
            updatedAt: string;
            version: number;
        };
        OrdersResponseDto: {
            items: {
                /** Format: uuid */
                buyerId: string;
                /** Format: date-time */
                createdAt: string;
                /** @enum {string} */
                currency: "COP" | "USD" | "EUR";
                /** Format: date-time */
                expiresAt: string;
                /** Format: uuid */
                id: string;
                /** Format: uuid */
                organizationId: string;
                /** Format: date-time */
                paidAt: string | null;
                /** Format: uuid */
                paymentId: string | null;
                /** Format: uuid */
                quoteId: string;
                snapshot: {
                    /** @enum {string} */
                    collector: "seller" | "platform";
                    /** @description Immutable provider-managed split allocation before provider fees. Missing only on historical quotes/orders. Included-price taxes remain part of product subtotal. */
                    commission?: {
                        /** @enum {string} */
                        base: "product_subtotal";
                        baseMinor: number;
                        platformMinor: number;
                        policyId: string;
                        /** @enum {string} */
                        processingFeeBearer: "seller";
                        rateBasisPoints: number;
                        sellerMinor: number;
                        totalMinor: number;
                    };
                    contact: {
                        address: string;
                        addressLine2: string | null;
                        city: string;
                        countryCode: string;
                        phone: string;
                        postalCode: string | null;
                        recipient: string;
                    };
                    /** @enum {string} */
                    currency: "COP" | "USD" | "EUR";
                    /** @enum {string} */
                    fulfillment: "pickup" | "delivery";
                    lines: {
                        attributes: {
                            [key: string]: string;
                        };
                        /** Format: uuid */
                        holdId: string;
                        name: string;
                        /** Format: uuid */
                        productId: string;
                        productVersion: number;
                        quantity: number;
                        sku: string;
                        subtotalMinor: number;
                        taxMinor: number;
                        unitPriceMinor: number;
                        /** Format: uuid */
                        variantId: string;
                    }[];
                    /** Format: uuid */
                    organizationId: string;
                    pickupAddress: {
                        address: string;
                        addressLine2: string | null;
                        city: string;
                        countryCode: string;
                        phone: string;
                        postalCode: string | null;
                        recipient: string;
                    } | null;
                    policyVersion: number;
                    shippingMinor: number;
                    subtotalMinor: number;
                    /** @description Null when taxes are included in listed prices; otherwise explicit additional tax in minor units. */
                    taxMinor: number | null;
                    /** @enum {string} */
                    taxMode: "included" | "added";
                    terms: string;
                    totalMinor: number;
                };
                /** @enum {string} */
                status: "awaiting_payment" | "paid" | "preparing" | "dispatched" | "ready_for_pickup" | "delivered" | "cancelled" | "expired";
                totalMinor: number;
                /** Format: date-time */
                updatedAt: string;
                version: number;
            }[];
            limit: number;
            page: number;
            total: number;
        };
        OrganizationAuditResponseDto: {
            items: {
                /** @enum {string} */
                action: "organization.created" | "organization.requested" | "organization.profile_updated" | "organization.submitted" | "organization.approved" | "organization.rejected" | "organization.status_changed" | "organization.responsible_changed" | "organization.deleted" | "membership.role_assigned" | "membership.role_removed";
                /** Format: uuid */
                actorId: string;
                /** Format: date-time */
                createdAt: string;
                /** Format: uuid */
                id: string;
                nextValue: string | null;
                /** Format: uuid */
                organizationId: string;
                previousValue: string | null;
                reason: string;
                requestId: string;
                /** Format: uuid */
                targetUserId: string | null;
            }[];
            limit: number;
            page: number;
            total: number;
        };
        OrganizationDecisionDto: {
            /** @description Current organization version. A stale version returns HTTP 409. */
            expectedVersion: number;
            /**
             * @description Required administrative justification stored in immutable audit records.
             * @example Organization and responsible account reviewed by administration.
             */
            reason: string;
        };
        OrganizationDeletedDto: {
            /** @enum {string} */
            message: "Organization archived.";
        };
        OrganizationMembersResponseDto: {
            items: {
                /** Format: date-time */
                createdAt: string;
                /** Format: uuid */
                id: string;
                /** Format: uuid */
                organizationId: string;
                /** @enum {string} */
                role: "business_admin" | "business_operator" | "adoption_admin" | "adoption_operator";
                /** Format: date-time */
                updatedAt: string;
                /** Format: uuid */
                userId: string;
            }[];
            limit: number;
            page: number;
            total: number;
        };
        OrganizationPageResponseDto: {
            items: {
                /** Format: date-time */
                createdAt: string;
                /** Format: uuid */
                id: string;
                name: string;
                /** @enum {string} */
                status: "draft" | "pending" | "active" | "rejected" | "suspended" | "deleted";
                /** @enum {string} */
                type: "business" | "adoption_entity";
                /** Format: date-time */
                updatedAt: string;
                version: number;
            }[];
            limit: number;
            page: number;
            total: number;
        };
        OrganizationProfileResponseDto: {
            address: string | null;
            addressLine2: string | null;
            /** Format: uuid */
            applicantId: string | null;
            /** Format: date-time */
            approvedAt: string | null;
            city: string | null;
            countryCode: string | null;
            /** Format: date-time */
            createdAt: string;
            /** Format: date-time */
            deletedAt: string | null;
            description: string | null;
            /** Format: email */
            email: string | null;
            /** Format: uuid */
            id: string;
            legalName: string | null;
            name: string;
            phone: string | null;
            postalCode: string | null;
            region: string | null;
            registrationNumber: string | null;
            /** Format: uuid */
            responsibleUserId: string | null;
            /** Format: date-time */
            reviewedAt: string | null;
            /** Format: uuid */
            reviewedBy: string | null;
            reviewReason: string | null;
            /** @enum {string} */
            status: "draft" | "pending" | "active" | "rejected" | "suspended" | "deleted";
            /** Format: date-time */
            submittedAt: string | null;
            /** Format: date-time */
            suspendedAt: string | null;
            /** @enum {string} */
            type: "business" | "adoption_entity";
            /** Format: date-time */
            updatedAt: string;
            version: number;
            /** Format: uri */
            website: string | null;
        };
        OrganizationResponseDto: {
            /** Format: date-time */
            createdAt: string;
            /** Format: uuid */
            id: string;
            name: string;
            /** @enum {string} */
            status: "draft" | "pending" | "active" | "rejected" | "suspended" | "deleted";
            /** @enum {string} */
            type: "business" | "adoption_entity";
            /** Format: date-time */
            updatedAt: string;
            version: number;
        };
        OrganizationResponsibleDto: {
            /** @description Current organization version. A stale version returns HTTP 409. */
            expectedVersion: number;
            /**
             * @description Required administrative justification stored in immutable audit records.
             * @example Organization and responsible account reviewed by administration.
             */
            reason: string;
            /**
             * Format: uuid
             * @description Explicitly selected active verified account. The superadministrator assigns its matching organization administrator role atomically.
             */
            responsibleUserId: string;
        };
        OrganizationStatusDto: {
            /** @description Current organization version. A stale version returns HTTP 409. */
            expectedVersion: number;
            /**
             * @description Required administrative justification stored in immutable audit records.
             * @example Organization and responsible account reviewed by administration.
             */
            reason: string;
            /** @enum {string} */
            status: "active" | "suspended";
        };
        PaymentFinancialsResponseDto: {
            events: {
                /** Format: date-time */
                createdAt: string;
                eventId: string;
                /** Format: uuid */
                id: string;
                observation: {
                    amountMinor: number;
                    currency: string;
                    /** @enum {string} */
                    distributionStatus: "unconfirmed" | "pending" | "distributed" | "failed";
                    eventId: string;
                    feeMinor: number | null;
                    /** Format: uuid */
                    paymentId: string;
                    reference: string;
                    /** @enum {string} */
                    status: "pending" | "approved" | "declined" | "cancelled";
                };
                /** @enum {string} */
                outcome: "applied" | "ignored" | "reconciliation_required";
                /** Format: uuid */
                paymentId: string;
                provider: string;
            }[];
            ledger: {
                amountMinor: number;
                /** Format: date-time */
                createdAt: string;
                /** Format: uuid */
                eventId: string;
                /** Format: uuid */
                id: string;
                /** @enum {string} */
                kind: "capture";
                /** Format: uuid */
                paymentId: string;
                platformMinor: number;
                sellerMinor: number;
            }[];
        };
        PaymentHistoryResponseDto: {
            items: {
                action: string;
                /** Format: uuid */
                actorId: string | null;
                /** Format: date-time */
                createdAt: string;
                /** Format: uuid */
                id: string;
                /** Format: uuid */
                paymentId: string;
                /** Format: uuid */
                requestId: string;
                version: number;
            }[];
            limit: number;
            page: number;
            total: number;
        };
        PaymentPolicyResponseDto: {
            /** @enum {string} */
            base: "product_subtotal";
            percent: number;
            /** @enum {string} */
            processingFeeBearer: "seller";
            provider: string;
            providerEnabled: boolean;
            rateBasisPoints: number;
        };
        PaymentResponseDto: {
            allocation: {
                /** @enum {string} */
                base: "product_subtotal";
                baseMinor: number;
                platformMinor: number;
                policyId: string;
                /** @enum {string} */
                processingFeeBearer: "seller";
                rateBasisPoints: number;
                sellerMinor: number;
                totalMinor: number;
            };
            amountMinor: number;
            /** Format: uuid */
            buyerId: string;
            /**
             * Format: uri
             * @description Null until a configured provider creates a checkout. Never a locally simulated payment URL.
             */
            checkoutUrl: string | null;
            /** Format: date-time */
            createdAt: string;
            /** @enum {string} */
            currency: "COP";
            /**
             * @description Provider-confirmed seller distribution is separate from buyer approval.
             * @enum {string}
             */
            distributionStatus: "unconfirmed" | "pending" | "distributed" | "failed";
            /** Format: date-time */
            expiresAt: string;
            /** @description Actual processing charge reported by provider; null means unknown, not zero. */
            feeMinor: number | null;
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            orderId: string;
            /** Format: uuid */
            organizationId: string;
            provider: string;
            reference: string | null;
            /** @enum {string} */
            status: "created" | "processing" | "pending" | "approved" | "declined" | "cancelled" | "expired" | "reconciliation_required";
            /** Format: date-time */
            updatedAt: string;
            version: number;
        };
        PaymentsResponseDto: {
            items: {
                allocation: {
                    /** @enum {string} */
                    base: "product_subtotal";
                    baseMinor: number;
                    platformMinor: number;
                    policyId: string;
                    /** @enum {string} */
                    processingFeeBearer: "seller";
                    rateBasisPoints: number;
                    sellerMinor: number;
                    totalMinor: number;
                };
                amountMinor: number;
                /** Format: uuid */
                buyerId: string;
                /**
                 * Format: uri
                 * @description Null until a configured provider creates a checkout. Never a locally simulated payment URL.
                 */
                checkoutUrl: string | null;
                /** Format: date-time */
                createdAt: string;
                /** @enum {string} */
                currency: "COP";
                /**
                 * @description Provider-confirmed seller distribution is separate from buyer approval.
                 * @enum {string}
                 */
                distributionStatus: "unconfirmed" | "pending" | "distributed" | "failed";
                /** Format: date-time */
                expiresAt: string;
                /** @description Actual processing charge reported by provider; null means unknown, not zero. */
                feeMinor: number | null;
                /** Format: uuid */
                id: string;
                /** Format: uuid */
                orderId: string;
                /** Format: uuid */
                organizationId: string;
                provider: string;
                reference: string | null;
                /** @enum {string} */
                status: "created" | "processing" | "pending" | "approved" | "declined" | "cancelled" | "expired" | "reconciliation_required";
                /** Format: date-time */
                updatedAt: string;
                version: number;
            }[];
            limit: number;
            page: number;
            total: number;
        };
        PhotoChangeResponseDto: {
            photo: {
                /** Format: date-time */
                createdAt: string;
                /** Format: uuid */
                id: string;
                /** Format: uuid */
                mediaId: string;
                position: number;
                /** Format: uuid */
                productId: string;
            };
            product: {
                brand: string | null;
                /** Format: uuid */
                categoryId: string;
                /** Format: date-time */
                createdAt: string;
                /** Format: uuid */
                createdBy: string;
                /** @enum {string} */
                currency: "COP" | "USD" | "EUR";
                description: string;
                /** Format: uuid */
                id: string;
                name: string;
                /** Format: uuid */
                organizationId: string;
                /** Format: date-time */
                reviewedAt: string | null;
                /** Format: uuid */
                reviewedBy: string | null;
                reviewReason: string | null;
                /** @enum {string} */
                status: "draft" | "pending" | "published" | "rejected" | "paused" | "archived";
                /** Format: date-time */
                updatedAt: string;
                version: number;
            };
        };
        PolicyAuditsResponseDto: {
            items: {
                /** Format: uuid */
                actorId: string;
                /** Format: date-time */
                createdAt: string;
                /** Format: uuid */
                id: string;
                /** Format: uuid */
                organizationId: string;
                reason: string;
                /** Format: uuid */
                requestId: string;
                snapshot: {
                    /** @enum {string} */
                    collector: "seller" | "platform";
                    /** @enum {string} */
                    currency: "COP" | "USD" | "EUR";
                    enabled: boolean;
                    pickupAddress: {
                        address: string;
                        addressLine2: string | null;
                        city: string;
                        countryCode: string;
                        phone: string;
                        postalCode: string | null;
                        recipient: string;
                    } | null;
                    shippingRules: {
                        city: string;
                        countryCode: string;
                        feeMinor: number;
                    }[];
                    shippingTaxBasisPoints: number;
                    /** @enum {string} */
                    taxMode: "included" | "added";
                    taxRates: {
                        [key: string]: number;
                    };
                    terms: string;
                };
                version: number;
            }[];
            limit: number;
            page: number;
            total: number;
        };
        PolicyResponseDto: {
            policy: {
                /** @enum {string} */
                collector: "seller" | "platform";
                /** @enum {string} */
                currency: "COP" | "USD" | "EUR";
                enabled: boolean;
                /** Format: uuid */
                organizationId: string;
                pickupAddress: {
                    address: string;
                    addressLine2: string | null;
                    city: string;
                    countryCode: string;
                    phone: string;
                    postalCode: string | null;
                    recipient: string;
                } | null;
                shippingRules: {
                    city: string;
                    countryCode: string;
                    feeMinor: number;
                }[];
                shippingTaxBasisPoints: number;
                /** @enum {string} */
                taxMode: "included" | "added";
                taxRates: {
                    [key: string]: number;
                };
                terms: string;
                /** Format: date-time */
                updatedAt: string;
                version: number;
            } | null;
        };
        PreferencesDto: {
            adoptionsEmail: boolean;
            bookingsEmail: boolean;
            expectedVersion: number;
            ordersEmail: boolean;
        };
        PrivateProductDetailDto: {
            photos: {
                /** Format: date-time */
                createdAt: string;
                /** Format: uuid */
                id: string;
                /** Format: uuid */
                mediaId: string;
                position: number;
                /** Format: uuid */
                productId: string;
            }[];
            product: {
                brand: string | null;
                /** Format: uuid */
                categoryId: string;
                /** Format: date-time */
                createdAt: string;
                /** Format: uuid */
                createdBy: string;
                /** @enum {string} */
                currency: "COP" | "USD" | "EUR";
                description: string;
                /** Format: uuid */
                id: string;
                name: string;
                /** Format: uuid */
                organizationId: string;
                /** Format: date-time */
                reviewedAt: string | null;
                /** Format: uuid */
                reviewedBy: string | null;
                reviewReason: string | null;
                /** @enum {string} */
                status: "draft" | "pending" | "published" | "rejected" | "paused" | "archived";
                /** Format: date-time */
                updatedAt: string;
                version: number;
            };
            variants: {
                attributes: {
                    [key: string]: string;
                };
                /** Format: date-time */
                createdAt: string;
                /** Format: uuid */
                id: string;
                /** Format: uuid */
                organizationId: string;
                priceMinor: number;
                /** Format: uuid */
                productId: string;
                sku: string;
                /** @enum {string} */
                status: "active" | "archived";
                /** Format: date-time */
                updatedAt: string;
            }[];
        };
        PrivateProductsResponseDto: {
            items: {
                photos: {
                    /** Format: date-time */
                    createdAt: string;
                    /** Format: uuid */
                    id: string;
                    /** Format: uuid */
                    mediaId: string;
                    position: number;
                    /** Format: uuid */
                    productId: string;
                }[];
                product: {
                    brand: string | null;
                    /** Format: uuid */
                    categoryId: string;
                    /** Format: date-time */
                    createdAt: string;
                    /** Format: uuid */
                    createdBy: string;
                    /** @enum {string} */
                    currency: "COP" | "USD" | "EUR";
                    description: string;
                    /** Format: uuid */
                    id: string;
                    name: string;
                    /** Format: uuid */
                    organizationId: string;
                    /** Format: date-time */
                    reviewedAt: string | null;
                    /** Format: uuid */
                    reviewedBy: string | null;
                    reviewReason: string | null;
                    /** @enum {string} */
                    status: "draft" | "pending" | "published" | "rejected" | "paused" | "archived";
                    /** Format: date-time */
                    updatedAt: string;
                    version: number;
                };
                variants: {
                    attributes: {
                        [key: string]: string;
                    };
                    /** Format: date-time */
                    createdAt: string;
                    /** Format: uuid */
                    id: string;
                    /** Format: uuid */
                    organizationId: string;
                    priceMinor: number;
                    /** Format: uuid */
                    productId: string;
                    sku: string;
                    /** @enum {string} */
                    status: "active" | "archived";
                    /** Format: date-time */
                    updatedAt: string;
                }[];
            }[];
            limit: number;
            page: number;
            total: number;
        };
        PrivatePublicationsResponseDto: {
            items: {
                /** Format: uuid */
                animalId: string;
                /** @description Public locality only; street addresses are never part of the publication. */
                city: string;
                /** Format: date-time */
                closedAt: string | null;
                /** @description Adoption requirements shown publicly and accepted by the applicant. */
                conditions: string;
                countryCode: string;
                /** Format: date-time */
                createdAt: string;
                /** Format: uuid */
                createdBy: string;
                /** Format: date-time */
                deletedAt: string | null;
                description: string;
                /** Format: uuid */
                id: string;
                /** Format: uuid */
                organizationId: string;
                /** Format: date-time */
                publishedAt: string | null;
                /** Format: date-time */
                reviewedAt: string | null;
                /** Format: uuid */
                reviewedBy: string | null;
                /** @description Administrative review justification; null before review. */
                reviewReason: string | null;
                snapshot: {
                    birthDateEstimated: boolean;
                    breed: string | null;
                    color: string | null;
                    /** Format: date */
                    dateOfBirth: string | null;
                    description: string | null;
                    /** Format: uuid */
                    id: string;
                    name: string;
                    photos: {
                        /** Format: uuid */
                        animalId: string;
                        /** Format: date-time */
                        createdAt: string;
                        /** Format: uuid */
                        id: string;
                        /** Format: uuid */
                        mediaId: string;
                        position: number;
                    }[];
                    /** @enum {string} */
                    sex: "male" | "female" | "unknown";
                    /** @enum {string} */
                    size: "small" | "medium" | "large" | "extra_large" | "unknown";
                    specialNeeds: string | null;
                    /** @enum {string} */
                    species: "dog" | "cat" | "bird" | "rabbit" | "reptile" | "rodent" | "equine" | "other";
                } | null;
                /** @enum {string} */
                status: "draft" | "pending" | "published" | "rejected" | "paused" | "closed" | "deleted";
                /** Format: date-time */
                submittedAt: string | null;
                title: string;
                /** Format: date-time */
                updatedAt: string;
                version: number;
            }[];
            limit: number;
            page: number;
            total: number;
        };
        ProductDecisionDto: {
            /** @description Current resource version. Stale changes return 409. */
            expectedVersion: number;
            /**
             * @description Audited justification. Do not include credentials.
             * @example Catalog updated after the supplier review.
             */
            reason: string;
        };
        ProductResponseDto: {
            brand: string | null;
            /** Format: uuid */
            categoryId: string;
            /** Format: date-time */
            createdAt: string;
            /** Format: uuid */
            createdBy: string;
            /** @enum {string} */
            currency: "COP" | "USD" | "EUR";
            description: string;
            /** Format: uuid */
            id: string;
            name: string;
            /** Format: uuid */
            organizationId: string;
            /** Format: date-time */
            reviewedAt: string | null;
            /** Format: uuid */
            reviewedBy: string | null;
            reviewReason: string | null;
            /** @enum {string} */
            status: "draft" | "pending" | "published" | "rejected" | "paused" | "archived";
            /** Format: date-time */
            updatedAt: string;
            version: number;
        };
        ProductReviewDto: {
            approved: boolean;
            /** @description Current resource version. Stale changes return 409. */
            expectedVersion: number;
            /**
             * @description Audited justification. Do not include credentials.
             * @example Catalog updated after the supplier review.
             */
            reason: string;
        };
        PublicationDecisionDto: {
            /** @description Current expectedVersion. Stale changes return 409. */
            expectedVersion: number;
            /** @description Decision justification retained in immutable audit. */
            reason: string;
        };
        PublicationDeletedDto: {
            /** @enum {string} */
            message: "Publication archived.";
        };
        PublicationResponseDto: {
            /** Format: uuid */
            animalId: string;
            /** @description Public locality only; street addresses are never part of the publication. */
            city: string;
            /** Format: date-time */
            closedAt: string | null;
            /** @description Adoption requirements shown publicly and accepted by the applicant. */
            conditions: string;
            countryCode: string;
            /** Format: date-time */
            createdAt: string;
            /** Format: uuid */
            createdBy: string;
            /** Format: date-time */
            deletedAt: string | null;
            description: string;
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            organizationId: string;
            /** Format: date-time */
            publishedAt: string | null;
            /** Format: date-time */
            reviewedAt: string | null;
            /** Format: uuid */
            reviewedBy: string | null;
            /** @description Administrative review justification; null before review. */
            reviewReason: string | null;
            snapshot: {
                birthDateEstimated: boolean;
                breed: string | null;
                color: string | null;
                /** Format: date */
                dateOfBirth: string | null;
                description: string | null;
                /** Format: uuid */
                id: string;
                name: string;
                photos: {
                    /** Format: uuid */
                    animalId: string;
                    /** Format: date-time */
                    createdAt: string;
                    /** Format: uuid */
                    id: string;
                    /** Format: uuid */
                    mediaId: string;
                    position: number;
                }[];
                /** @enum {string} */
                sex: "male" | "female" | "unknown";
                /** @enum {string} */
                size: "small" | "medium" | "large" | "extra_large" | "unknown";
                specialNeeds: string | null;
                /** @enum {string} */
                species: "dog" | "cat" | "bird" | "rabbit" | "reptile" | "rodent" | "equine" | "other";
            } | null;
            /** @enum {string} */
            status: "draft" | "pending" | "published" | "rejected" | "paused" | "closed" | "deleted";
            /** Format: date-time */
            submittedAt: string | null;
            title: string;
            /** Format: date-time */
            updatedAt: string;
            version: number;
        };
        PublicProductDetailDto: {
            photos: {
                /** Format: date-time */
                createdAt: string;
                /** Format: uuid */
                id: string;
                /** Format: uuid */
                mediaId: string;
                position: number;
                /** Format: uuid */
                productId: string;
            }[];
            product: {
                brand: string | null;
                /** Format: uuid */
                categoryId: string;
                /** @enum {string} */
                currency: "COP" | "USD" | "EUR";
                description: string;
                /** Format: uuid */
                id: string;
                name: string;
                /** Format: uuid */
                organizationId: string;
                version: number;
            };
            variants: {
                attributes: {
                    [key: string]: string;
                };
                /** Format: date-time */
                createdAt: string;
                /** Format: uuid */
                id: string;
                /** Format: uuid */
                organizationId: string;
                priceMinor: number;
                /** Format: uuid */
                productId: string;
                sku: string;
                /** @enum {string} */
                status: "active" | "archived";
                /** Format: date-time */
                updatedAt: string;
            }[];
        };
        PublicProductsResponseDto: {
            items: {
                photos: {
                    /** Format: date-time */
                    createdAt: string;
                    /** Format: uuid */
                    id: string;
                    /** Format: uuid */
                    mediaId: string;
                    position: number;
                    /** Format: uuid */
                    productId: string;
                }[];
                product: {
                    brand: string | null;
                    /** Format: uuid */
                    categoryId: string;
                    /** @enum {string} */
                    currency: "COP" | "USD" | "EUR";
                    description: string;
                    /** Format: uuid */
                    id: string;
                    name: string;
                    /** Format: uuid */
                    organizationId: string;
                    version: number;
                };
                variants: {
                    attributes: {
                        [key: string]: string;
                    };
                    /** Format: date-time */
                    createdAt: string;
                    /** Format: uuid */
                    id: string;
                    /** Format: uuid */
                    organizationId: string;
                    priceMinor: number;
                    /** Format: uuid */
                    productId: string;
                    sku: string;
                    /** @enum {string} */
                    status: "active" | "archived";
                    /** Format: date-time */
                    updatedAt: string;
                }[];
            }[];
            limit: number;
            nextPage: number | null;
            page: number;
        };
        PublicPublicationResponseDto: {
            /** Format: uuid */
            animalId: string;
            /** @description Public locality only; street addresses are never part of the publication. */
            city: string;
            /** @description Adoption requirements shown publicly and accepted by the applicant. */
            conditions: string;
            countryCode: string;
            description: string;
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            organizationId: string;
            /** Format: date-time */
            publishedAt: string | null;
            snapshot: {
                birthDateEstimated: boolean;
                breed: string | null;
                color: string | null;
                /** Format: date */
                dateOfBirth: string | null;
                description: string | null;
                /** Format: uuid */
                id: string;
                name: string;
                photos: {
                    /** Format: uuid */
                    animalId: string;
                    /** Format: date-time */
                    createdAt: string;
                    /** Format: uuid */
                    id: string;
                    /** Format: uuid */
                    mediaId: string;
                    position: number;
                }[];
                /** @enum {string} */
                sex: "male" | "female" | "unknown";
                /** @enum {string} */
                size: "small" | "medium" | "large" | "extra_large" | "unknown";
                specialNeeds: string | null;
                /** @enum {string} */
                species: "dog" | "cat" | "bird" | "rabbit" | "reptile" | "rodent" | "equine" | "other";
            } | null;
            title: string;
            version: number;
        };
        PublicPublicationsResponseDto: {
            items: {
                /** Format: uuid */
                animalId: string;
                /** @description Public locality only; street addresses are never part of the publication. */
                city: string;
                /** @description Adoption requirements shown publicly and accepted by the applicant. */
                conditions: string;
                countryCode: string;
                description: string;
                /** Format: uuid */
                id: string;
                /** Format: uuid */
                organizationId: string;
                /** Format: date-time */
                publishedAt: string | null;
                snapshot: {
                    birthDateEstimated: boolean;
                    breed: string | null;
                    color: string | null;
                    /** Format: date */
                    dateOfBirth: string | null;
                    description: string | null;
                    /** Format: uuid */
                    id: string;
                    name: string;
                    photos: {
                        /** Format: uuid */
                        animalId: string;
                        /** Format: date-time */
                        createdAt: string;
                        /** Format: uuid */
                        id: string;
                        /** Format: uuid */
                        mediaId: string;
                        position: number;
                    }[];
                    /** @enum {string} */
                    sex: "male" | "female" | "unknown";
                    /** @enum {string} */
                    size: "small" | "medium" | "large" | "extra_large" | "unknown";
                    specialNeeds: string | null;
                    /** @enum {string} */
                    species: "dog" | "cat" | "bird" | "rabbit" | "reptile" | "rodent" | "equine" | "other";
                } | null;
                title: string;
                version: number;
            }[];
            /** Format: uuid */
            nextCursor: string | null;
        };
        PublicServiceDto: {
            acceptedSpecies: ("dog" | "cat" | "bird" | "rabbit" | "reptile" | "rodent" | "equine" | "other")[];
            bufferAfterMinutes: number;
            bufferBeforeMinutes: number;
            cancellationCutoffMinutes: number;
            /** @enum {string} */
            category: "grooming" | "daycare" | "training" | "lodging" | "veterinary";
            checkInMinute: number | null;
            checkOutMinute: number | null;
            /** @enum {string} */
            collectionMode: "pay_at_business";
            /** @enum {string} */
            confirmationMode: "automatic" | "manual";
            /** Format: date-time */
            createdAt: string;
            /** @enum {string} */
            currency: "COP";
            description: string;
            durationMinutes: number | null;
            /** Format: uuid */
            id: string;
            /** @enum {string} */
            kind: "appointment" | "lodging";
            maxNights: number;
            minimumNoticeMinutes: number;
            minNights: number;
            name: string;
            /** Format: uuid */
            organizationId: string;
            priceMinor: number;
            requestTtlMinutes: number;
            requirements: string;
            resourceIds: string[];
            /** @enum {string} */
            status: "draft" | "pending" | "published" | "rejected" | "paused" | "archived";
            terms: string;
            /** @enum {string} */
            timeZone: "America/Bogota";
            /** Format: date-time */
            updatedAt: string;
            version: number;
            /** Format: uuid */
            veterinaryCredentialId: string | null;
        };
        PublicServicesDto: {
            items: {
                acceptedSpecies: ("dog" | "cat" | "bird" | "rabbit" | "reptile" | "rodent" | "equine" | "other")[];
                bufferAfterMinutes: number;
                bufferBeforeMinutes: number;
                cancellationCutoffMinutes: number;
                /** @enum {string} */
                category: "grooming" | "daycare" | "training" | "lodging" | "veterinary";
                checkInMinute: number | null;
                checkOutMinute: number | null;
                /** @enum {string} */
                collectionMode: "pay_at_business";
                /** @enum {string} */
                confirmationMode: "automatic" | "manual";
                /** Format: date-time */
                createdAt: string;
                /** @enum {string} */
                currency: "COP";
                description: string;
                durationMinutes: number | null;
                /** Format: uuid */
                id: string;
                /** @enum {string} */
                kind: "appointment" | "lodging";
                maxNights: number;
                minimumNoticeMinutes: number;
                minNights: number;
                name: string;
                /** Format: uuid */
                organizationId: string;
                priceMinor: number;
                requestTtlMinutes: number;
                requirements: string;
                resourceIds: string[];
                /** @enum {string} */
                status: "draft" | "pending" | "published" | "rejected" | "paused" | "archived";
                terms: string;
                /** @enum {string} */
                timeZone: "America/Bogota";
                /** Format: date-time */
                updatedAt: string;
                version: number;
                /** Format: uuid */
                veterinaryCredentialId: string | null;
            }[];
            limit: number;
            nextPage: number | null;
            page: number;
        };
        PutCartItemDto: {
            /** @description Version from the current own cart. Stale commands return 409. */
            expectedVersion: number;
            /** @description Absolute quantity, not an increment. Adding to the cart never reserves stock. */
            quantity: number;
        };
        QuoteRequestDto: {
            contact: {
                address: string;
                /** @default null */
                addressLine2: string | null;
                city: string;
                /**
                 * @description ISO 3166-1 alpha-2 country.
                 * @example CO
                 */
                countryCode: string;
                /**
                 * @description International E.164 contact phone.
                 * @example +573001234567
                 */
                phone: string;
                /** @default null */
                postalCode: string | null;
                recipient: string;
            };
            expectedCartVersion: number;
            /** @enum {string} */
            fulfillment: "pickup" | "delivery";
        };
        QuoteResponseDto: {
            /** Format: uuid */
            buyerId: string;
            /** Format: uuid */
            cartId: string;
            cartVersion: number;
            /** Format: date-time */
            createdAt: string;
            /** Format: date-time */
            expiresAt: string;
            /** Format: uuid */
            id: string;
            snapshot: {
                /** @enum {string} */
                collector: "seller" | "platform";
                /** @description Immutable provider-managed split allocation before provider fees. Missing only on historical quotes/orders. Included-price taxes remain part of product subtotal. */
                commission?: {
                    /** @enum {string} */
                    base: "product_subtotal";
                    baseMinor: number;
                    platformMinor: number;
                    policyId: string;
                    /** @enum {string} */
                    processingFeeBearer: "seller";
                    rateBasisPoints: number;
                    sellerMinor: number;
                    totalMinor: number;
                };
                contact: {
                    address: string;
                    addressLine2: string | null;
                    city: string;
                    countryCode: string;
                    phone: string;
                    postalCode: string | null;
                    recipient: string;
                };
                /** @enum {string} */
                currency: "COP" | "USD" | "EUR";
                /** @enum {string} */
                fulfillment: "pickup" | "delivery";
                lines: {
                    attributes: {
                        [key: string]: string;
                    };
                    /** Format: uuid */
                    holdId: string;
                    name: string;
                    /** Format: uuid */
                    productId: string;
                    productVersion: number;
                    quantity: number;
                    sku: string;
                    subtotalMinor: number;
                    taxMinor: number;
                    unitPriceMinor: number;
                    /** Format: uuid */
                    variantId: string;
                }[];
                /** Format: uuid */
                organizationId: string;
                pickupAddress: {
                    address: string;
                    addressLine2: string | null;
                    city: string;
                    countryCode: string;
                    phone: string;
                    postalCode: string | null;
                    recipient: string;
                } | null;
                policyVersion: number;
                shippingMinor: number;
                subtotalMinor: number;
                /** @description Null when taxes are included in listed prices; otherwise explicit additional tax in minor units. */
                taxMinor: number | null;
                /** @enum {string} */
                taxMode: "included" | "added";
                terms: string;
                totalMinor: number;
            };
        };
        ReadAllNotificationsDto: {
            /**
             * Format: date-time
             * @description Mark only notifications created at or before this UTC timestamp. Cannot be in the future.
             */
            through: string;
        };
        ReadAllNotificationsResponseDto: {
            updated: number;
        };
        ReconcilePaymentDto: Record<string, never>;
        RefreshRequestDto: {
            /**
             * @description Mobile refresh token; omit when using the web cookie.
             * @example AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
             */
            refreshToken?: string;
        };
        RegisterRequestDto: {
            /**
             * @description Street address and building number.
             * @example Calle Mayor 10
             */
            address?: string | null;
            /**
             * @description Optional apartment, floor or additional address information.
             * @example Floor 2, apartment B
             */
            addressLine2?: string | null;
            /**
             * @description City or locality.
             * @example Madrid
             */
            city?: string | null;
            /**
             * @description Uppercase ISO 3166-1 alpha-2 country code.
             * @example ES
             * @enum {string|null}
             */
            countryCode?: "AD" | "AE" | "AF" | "AG" | "AI" | "AL" | "AM" | "AO" | "AQ" | "AR" | "AS" | "AT" | "AU" | "AW" | "AX" | "AZ" | "BA" | "BB" | "BD" | "BE" | "BF" | "BG" | "BH" | "BI" | "BJ" | "BL" | "BM" | "BN" | "BO" | "BQ" | "BR" | "BS" | "BT" | "BV" | "BW" | "BY" | "BZ" | "CA" | "CC" | "CD" | "CF" | "CG" | "CH" | "CI" | "CK" | "CL" | "CM" | "CN" | "CO" | "CR" | "CU" | "CV" | "CW" | "CX" | "CY" | "CZ" | "DE" | "DJ" | "DK" | "DM" | "DO" | "DZ" | "EC" | "EE" | "EG" | "EH" | "ER" | "ES" | "ET" | "FI" | "FJ" | "FK" | "FM" | "FO" | "FR" | "GA" | "GB" | "GD" | "GE" | "GF" | "GG" | "GH" | "GI" | "GL" | "GM" | "GN" | "GP" | "GQ" | "GR" | "GS" | "GT" | "GU" | "GW" | "GY" | "HK" | "HM" | "HN" | "HR" | "HT" | "HU" | "ID" | "IE" | "IL" | "IM" | "IN" | "IO" | "IQ" | "IR" | "IS" | "IT" | "JE" | "JM" | "JO" | "JP" | "KE" | "KG" | "KH" | "KI" | "KM" | "KN" | "KP" | "KR" | "KW" | "KY" | "KZ" | "LA" | "LB" | "LC" | "LI" | "LK" | "LR" | "LS" | "LT" | "LU" | "LV" | "LY" | "MA" | "MC" | "MD" | "ME" | "MF" | "MG" | "MH" | "MK" | "ML" | "MM" | "MN" | "MO" | "MP" | "MQ" | "MR" | "MS" | "MT" | "MU" | "MV" | "MW" | "MX" | "MY" | "MZ" | "NA" | "NC" | "NE" | "NF" | "NG" | "NI" | "NL" | "NO" | "NP" | "NR" | "NU" | "NZ" | "OM" | "PA" | "PE" | "PF" | "PG" | "PH" | "PK" | "PL" | "PM" | "PN" | "PR" | "PS" | "PT" | "PW" | "PY" | "QA" | "RE" | "RO" | "RS" | "RU" | "RW" | "SA" | "SB" | "SC" | "SD" | "SE" | "SG" | "SH" | "SI" | "SJ" | "SK" | "SL" | "SM" | "SN" | "SO" | "SR" | "SS" | "ST" | "SV" | "SX" | "SY" | "SZ" | "TC" | "TD" | "TF" | "TG" | "TH" | "TJ" | "TK" | "TL" | "TM" | "TN" | "TO" | "TR" | "TT" | "TV" | "TW" | "TZ" | "UA" | "UG" | "UM" | "US" | "UY" | "UZ" | "VA" | "VC" | "VE" | "VG" | "VI" | "VN" | "VU" | "WF" | "WS" | "YE" | "YT" | "ZA" | "ZM" | "ZW" | null;
            /**
             * Format: date
             * @description Date of birth as YYYY-MM-DD; age is calculated from this value in UTC. No future dates or ages above 120.
             * @example 1995-06-15
             */
            dateOfBirth?: string | null;
            /**
             * @description Unique email address; trimmed and normalized to lowercase.
             * @example alex@example.com
             */
            email: string;
            /**
             * @description Family name(s). Kept separate from given names.
             * @example Rivera
             */
            lastName: unknown & unknown;
            /**
             * @description Given name(s). Unicode letters, spaces, apostrophes, periods and hyphens are supported.
             * @example Alex
             */
            name: unknown & unknown;
            /**
             * @description Password, 12 to 128 characters; never trimmed, returned or logged.
             * @example A-long-unique-password
             */
            password: string;
            /**
             * @description International E.164 telephone number; formatting is checked, ownership is not verified.
             * @example +34612345678
             */
            phone?: string | null;
            /**
             * @description Postal code. International formats and leading zeros are preserved.
             * @example 28013
             */
            postalCode?: string | null;
            /**
             * @description State, province or administrative region.
             * @example Comunidad de Madrid
             */
            region?: string | null;
        };
        RemoveMembershipRequestDto: {
            /**
             * @description Required administrative justification stored in immutable audit records.
             * @example Organization and responsible account reviewed by administration.
             */
            reason: string;
        };
        RequestOrganizationDto: {
            name: string;
            profile?: {
                address?: string | null;
                addressLine2?: string | null;
                city?: string | null;
                /**
                 * @description ISO 3166-1 alpha-2 country; required before review and part of registration uniqueness.
                 * @example CO
                 */
                countryCode?: string | null;
                /** @description Optional public-facing organization description; plain text. */
                description?: string | null;
                /**
                 * @description Organization contact address; separate from user authentication and not email-verified by this workflow.
                 * @example contact@example.com
                 */
                email?: string | null;
                /**
                 * @description Legal organization name, required before submission. Changes require renewed approval.
                 * @example Mascotas Quindío SAS
                 */
                legalName?: string | null;
                /**
                 * @description Organization contact phone in E.164 format; SMS verification is not enabled.
                 * @example +573001234567
                 */
                phone?: string | null;
                postalCode?: string | null;
                region?: string | null;
                /**
                 * @description Registration identifier, normalized uppercase without spaces/dots/hyphens/slashes. Unique with countryCode; not a legal validity check.
                 * @example 900.123.456-7
                 */
                registrationNumber?: string | null;
                /** Format: uri */
                website?: string | null;
            };
            /** @enum {string} */
            type: "business" | "adoption_entity";
        };
        RescheduleBookingDto: {
            /**
             * @description Explicit acceptance of the displayed service terms, price, cancellation policy and sharing contact/pet identity with the chosen provider.
             * @enum {boolean}
             */
            consent: true;
            contact: {
                name: string;
                phone: string;
            };
            expectedResourceVersion: number;
            expectedServiceVersion: number;
            expectedTotalMinor: number;
            expectedVersion: number;
            reason: string;
            /** Format: uuid */
            resourceId: string;
            slot: {
                /** @enum {string} */
                kind: "appointment";
                /**
                 * Format: date-time
                 * @description UTC ISO timestamp, exact quarter-hour.
                 */
                startsAt: string;
            } | {
                /** Format: date */
                endDate: string;
                /** @enum {string} */
                kind: "lodging";
                /** Format: date */
                startDate: string;
            };
        };
        ResendInvitationRequestDto: {
            /**
             * @description Required administrative justification recorded in the audit trail. Avoid unnecessary personal data.
             * @example Account suspended after reviewing repeated abuse reports.
             */
            reason: string;
        };
        ResetPasswordRequestDto: {
            /**
             * @description Password, 12 to 128 characters; never trimmed, returned or logged.
             * @example A-long-unique-password
             */
            password: string;
            /**
             * @description Single-use 256-bit opaque action token from the email link.
             * @example AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
             */
            token: string;
        };
        ResourceResponseDto: {
            capacity: number;
            /** Format: date-time */
            createdAt: string;
            /** Format: uuid */
            id: string;
            /** @enum {string} */
            kind: "appointment" | "lodging";
            name: string;
            /** Format: uuid */
            organizationId: string;
            /** @enum {string} */
            status: "active" | "inactive";
            /** @enum {string} */
            timeZone: "America/Bogota";
            /** Format: date-time */
            updatedAt: string;
            version: number;
            windows: {
                day: number;
                endMinute: number;
                startMinute: number;
            }[];
        };
        ResourcesDto: {
            items: {
                capacity: number;
                /** Format: date-time */
                createdAt: string;
                /** Format: uuid */
                id: string;
                /** @enum {string} */
                kind: "appointment" | "lodging";
                name: string;
                /** Format: uuid */
                organizationId: string;
                /** @enum {string} */
                status: "active" | "inactive";
                /** @enum {string} */
                timeZone: "America/Bogota";
                /** Format: date-time */
                updatedAt: string;
                version: number;
                windows: {
                    day: number;
                    endMinute: number;
                    startMinute: number;
                }[];
            }[];
        };
        RetryDeliveryDto: {
            reason: string;
        };
        ReviewAdoptionRequestDto: {
            /** @description Current expectedVersion. Stale changes return 409. */
            expectedVersion: number;
            /** @description Decision justification retained in immutable audit. */
            reason: string;
            /** @enum {string} */
            status: "in_review" | "approved" | "rejected";
        };
        ReviewCredentialDto: {
            approved: boolean;
            expectedVersion: number;
            /**
             * @description Reviewer attests identity, veterinary qualification, registration and current authorization were independently checked.
             * @enum {boolean}
             */
            officialRegisterChecked: true;
            reason: string;
            /** @description Human reviewer evidence/reference from official COMVEZCOL verification. Never automatically fetched. */
            verificationReference: string | null;
            /** Format: date-time */
            verifiedUntil: string | null;
        };
        ReviewDto: {
            approved: boolean;
            /** @description Current aggregate version. Stale writes return 409. */
            expectedVersion: number;
            /** @description Audited administrative justification; exclude credentials and pet health details. */
            reason: string;
        };
        ReviewPublicationDto: {
            approved: boolean;
            /** @description Current expectedVersion. Stale changes return 409. */
            expectedVersion: number;
            /** @description Decision justification retained in immutable audit. */
            reason: string;
        };
        RolesResponseDto: {
            roles: {
                /** @enum {string|null} */
                organizationType: "business" | "adoption_entity" | null;
                /** @description Action/resource permissions. A permission does not bypass ownership, organization scope or domain state rules. Future-module permissions describe approved capabilities; their endpoints are not implemented yet. */
                permissions: ("payments.self.manage" | "payments.business.read" | "payments.platform.manage" | "cart.self.manage" | "orders.settings.manage" | "profile.self.manage" | "orders.self.manage" | "bookings.self.manage" | "adoptions.self.manage" | "users.status.update" | "users.roles.manage" | "organizations.create" | "organizations.requests.manage" | "organizations.profile.read" | "organizations.review" | "organizations.status.update" | "organizations.delete" | "organizations.members.read" | "organizations.audit.read" | "organizations.members.roles.manage" | "platform.settings.manage" | "moderation.publications.review" | "reports.manage" | "organizations.read" | "organizations.profile.update" | "catalog.manage" | "inventory.manage" | "orders.fulfillment.manage" | "services.manage" | "bookings.manage" | "animals.self.manage" | "adoptions.publications.manage" | "animals.manage" | "adoptions.requests.review")[];
                /** @enum {string} */
                role: "user" | "moderator" | "super_admin" | "business_admin" | "business_operator" | "adoption_admin" | "adoption_operator";
                /** @enum {string} */
                scope: "platform" | "organization";
            }[];
        };
        ServiceAuditsDto: {
            items: {
                action: string;
                /** Format: uuid */
                actorId: string;
                /** Format: date-time */
                createdAt: string;
                /** Format: uuid */
                id: string;
                /** Format: uuid */
                organizationId: string;
                reason: string;
                requestId: string;
                /** Format: uuid */
                resourceId: string | null;
                /** Format: uuid */
                serviceId: string | null;
                snapshot: {
                    [key: string]: unknown;
                };
                version: number;
            }[];
            total: number;
        };
        ServiceAvailabilityResponseDto: {
            resourceVersion: number;
            serviceVersion: number;
            slots: {
                /** Format: date-time */
                endsAt: string;
                remaining: number;
                /** Format: date-time */
                startsAt: string;
                totalMinor: number;
            }[];
            /** @enum {string} */
            timeZone: "America/Bogota";
            truncated: boolean;
        };
        ServiceResponseDto: {
            acceptedSpecies: ("dog" | "cat" | "bird" | "rabbit" | "reptile" | "rodent" | "equine" | "other")[];
            bufferAfterMinutes: number;
            bufferBeforeMinutes: number;
            cancellationCutoffMinutes: number;
            /** @enum {string} */
            category: "grooming" | "daycare" | "training" | "lodging" | "veterinary";
            checkInMinute: number | null;
            checkOutMinute: number | null;
            /** @enum {string} */
            collectionMode: "pay_at_business";
            /** @enum {string} */
            confirmationMode: "automatic" | "manual";
            /** Format: date-time */
            createdAt: string;
            /** Format: uuid */
            createdBy: string;
            /** @enum {string} */
            currency: "COP";
            description: string;
            durationMinutes: number | null;
            /** Format: uuid */
            id: string;
            /** @enum {string} */
            kind: "appointment" | "lodging";
            maxNights: number;
            minimumNoticeMinutes: number;
            minNights: number;
            name: string;
            /** Format: uuid */
            organizationId: string;
            priceMinor: number;
            requestTtlMinutes: number;
            requirements: string;
            resourceIds: string[];
            /** Format: date-time */
            reviewedAt: string | null;
            /** Format: uuid */
            reviewedBy: string | null;
            /** @description Audited publication decision reason; null before review. */
            reviewReason: string | null;
            /** @enum {string} */
            status: "draft" | "pending" | "published" | "rejected" | "paused" | "archived";
            terms: string;
            /** @enum {string} */
            timeZone: "America/Bogota";
            /** Format: date-time */
            updatedAt: string;
            version: number;
            /** Format: uuid */
            veterinaryCredentialId: string | null;
        };
        SessionPageResponseDto: {
            items: {
                /** Format: date-time */
                createdAt: string;
                current: boolean;
                /** Format: date-time */
                expiresAt: string;
                /** Format: uuid */
                id: string;
            }[];
            limit: number;
            page: number;
            total: number;
        };
        StockMovementDto: {
            expectedVersion: number;
            /**
             * Format: uuid
             * @description Unique command UUID within this organization. Retry the identical body safely; different content returns 409.
             */
            idempotencyKey: string;
            /** @enum {string} */
            kind: "receipt" | "issue" | "adjustment";
            quantity: number;
            /**
             * @description Audited operation justification.
             * @example Warehouse stock verified by the operator.
             */
            reason: string;
        };
        StockResponseDto: {
            available: number;
            onHand: number;
            reserved: number;
            /** Format: date-time */
            updatedAt: string;
            /** Format: uuid */
            variantId: string;
            version: number;
        };
        SubmitAdoptionRequestDto: {
            /**
             * @description Explicit acceptance of the current adoption conditions and consent to share current account name, email, phone, country and city with this shelter. No consent is inferred.
             * @enum {boolean}
             */
            consent: true;
            /** @description Version from the public listing you read. A changed listing returns 409 before consent is recorded. */
            expectedPublicationVersion: number;
            message: string;
        };
        UnreadNotificationsDto: {
            count: number;
        };
        UpdateAnimalDto: {
            /** @description Current expectedVersion. Stale updates return HTTP 409. */
            expectedVersion: number;
            profile: {
                birthDateEstimated?: boolean;
                breed?: string | null;
                color?: string | null;
                /** Format: date */
                dateOfBirth?: string | null;
                description?: string | null;
                /** @description Private clinical notes. Never included in public adoption listings. */
                healthNotes?: string | null;
                /** @description Private identification, never published in adoption listings. */
                microchip?: string | null;
                name?: string;
                /** @description Declared sterilization status; null means unknown. Not a veterinary certificate. */
                neutered?: boolean | null;
                /** @enum {string} */
                sex?: "male" | "female" | "unknown";
                /** @enum {string} */
                size?: "small" | "medium" | "large" | "extra_large" | "unknown";
                /** @description Publicly shareable care needs included only in the reviewed adoption snapshot. */
                specialNeeds?: string | null;
                /** @enum {string} */
                species?: "dog" | "cat" | "bird" | "rabbit" | "reptile" | "rodent" | "equine" | "other";
                /** @description Declared vaccination status; null means unknown. Not a veterinary certificate. */
                vaccinated?: boolean | null;
                weightGrams?: number | null;
            };
            /**
             * @description Justification saved in immutable audit; avoid secrets and unnecessary personal information.
             * @example Animal record updated following the shelter review.
             */
            reason: string;
        };
        UpdateCategoryDto: {
            /** @description Current resource version. Stale changes return 409. */
            expectedVersion: number;
            profile: {
                description?: string | null;
                name?: string;
                slug?: string;
                /** @enum {string} */
                status?: "active" | "inactive" | "archived";
            };
            /**
             * @description Audited justification. Do not include credentials.
             * @example Catalog updated after the supplier review.
             */
            reason: string;
        };
        UpdateOrganizationProfileDto: {
            /** @description Current organization version. A stale version returns HTTP 409. */
            expectedVersion: number;
            /** @description Organization contact and legal identity. Required before submission: legalName, registrationNumber, email, phone, countryCode, city and address. Registration identifiers are normalized, not legally certified. */
            profile: {
                address?: string | null;
                addressLine2?: string | null;
                city?: string | null;
                /**
                 * @description ISO 3166-1 alpha-2 country; required before review and part of registration uniqueness.
                 * @example CO
                 */
                countryCode?: string | null;
                /** @description Optional public-facing organization description; plain text. */
                description?: string | null;
                /**
                 * @description Organization contact address; separate from user authentication and not email-verified by this workflow.
                 * @example contact@example.com
                 */
                email?: string | null;
                /**
                 * @description Legal organization name, required before submission. Changes require renewed approval.
                 * @example Mascotas Quindío SAS
                 */
                legalName?: string | null;
                /**
                 * @description Organization display name; this does not change its legal identity.
                 * @example Mascotas Quindío
                 */
                name?: string;
                /**
                 * @description Organization contact phone in E.164 format; SMS verification is not enabled.
                 * @example +573001234567
                 */
                phone?: string | null;
                postalCode?: string | null;
                region?: string | null;
                /**
                 * @description Registration identifier, normalized uppercase without spaces/dots/hyphens/slashes. Unique with countryCode; not a legal validity check.
                 * @example 900.123.456-7
                 */
                registrationNumber?: string | null;
                /** Format: uri */
                website?: string | null;
            };
            /**
             * @description Required administrative justification stored in immutable audit records.
             * @example Organization and responsible account reviewed by administration.
             */
            reason: string;
        };
        UpdateProductDto: {
            /** @description Current resource version. Stale changes return 409. */
            expectedVersion: number;
            profile: {
                brand?: string | null;
                /** Format: uuid */
                categoryId?: string;
                description?: string;
                name?: string;
            };
            /**
             * @description Audited justification. Do not include credentials.
             * @example Catalog updated after the supplier review.
             */
            reason: string;
        };
        UpdateProfileRequestDto: {
            /**
             * @description Street address and building number.
             * @example Calle Mayor 10
             */
            address?: string | null;
            /**
             * @description Optional apartment, floor or additional address information.
             * @example Floor 2, apartment B
             */
            addressLine2?: string | null;
            /**
             * @description City or locality.
             * @example Madrid
             */
            city?: string | null;
            /**
             * @description Uppercase ISO 3166-1 alpha-2 country code.
             * @example ES
             * @enum {string|null}
             */
            countryCode?: "AD" | "AE" | "AF" | "AG" | "AI" | "AL" | "AM" | "AO" | "AQ" | "AR" | "AS" | "AT" | "AU" | "AW" | "AX" | "AZ" | "BA" | "BB" | "BD" | "BE" | "BF" | "BG" | "BH" | "BI" | "BJ" | "BL" | "BM" | "BN" | "BO" | "BQ" | "BR" | "BS" | "BT" | "BV" | "BW" | "BY" | "BZ" | "CA" | "CC" | "CD" | "CF" | "CG" | "CH" | "CI" | "CK" | "CL" | "CM" | "CN" | "CO" | "CR" | "CU" | "CV" | "CW" | "CX" | "CY" | "CZ" | "DE" | "DJ" | "DK" | "DM" | "DO" | "DZ" | "EC" | "EE" | "EG" | "EH" | "ER" | "ES" | "ET" | "FI" | "FJ" | "FK" | "FM" | "FO" | "FR" | "GA" | "GB" | "GD" | "GE" | "GF" | "GG" | "GH" | "GI" | "GL" | "GM" | "GN" | "GP" | "GQ" | "GR" | "GS" | "GT" | "GU" | "GW" | "GY" | "HK" | "HM" | "HN" | "HR" | "HT" | "HU" | "ID" | "IE" | "IL" | "IM" | "IN" | "IO" | "IQ" | "IR" | "IS" | "IT" | "JE" | "JM" | "JO" | "JP" | "KE" | "KG" | "KH" | "KI" | "KM" | "KN" | "KP" | "KR" | "KW" | "KY" | "KZ" | "LA" | "LB" | "LC" | "LI" | "LK" | "LR" | "LS" | "LT" | "LU" | "LV" | "LY" | "MA" | "MC" | "MD" | "ME" | "MF" | "MG" | "MH" | "MK" | "ML" | "MM" | "MN" | "MO" | "MP" | "MQ" | "MR" | "MS" | "MT" | "MU" | "MV" | "MW" | "MX" | "MY" | "MZ" | "NA" | "NC" | "NE" | "NF" | "NG" | "NI" | "NL" | "NO" | "NP" | "NR" | "NU" | "NZ" | "OM" | "PA" | "PE" | "PF" | "PG" | "PH" | "PK" | "PL" | "PM" | "PN" | "PR" | "PS" | "PT" | "PW" | "PY" | "QA" | "RE" | "RO" | "RS" | "RU" | "RW" | "SA" | "SB" | "SC" | "SD" | "SE" | "SG" | "SH" | "SI" | "SJ" | "SK" | "SL" | "SM" | "SN" | "SO" | "SR" | "SS" | "ST" | "SV" | "SX" | "SY" | "SZ" | "TC" | "TD" | "TF" | "TG" | "TH" | "TJ" | "TK" | "TL" | "TM" | "TN" | "TO" | "TR" | "TT" | "TV" | "TW" | "TZ" | "UA" | "UG" | "UM" | "US" | "UY" | "UZ" | "VA" | "VC" | "VE" | "VG" | "VI" | "VN" | "VU" | "WF" | "WS" | "YE" | "YT" | "ZA" | "ZM" | "ZW" | null;
            /**
             * Format: date
             * @description Date of birth as YYYY-MM-DD; age is calculated from this value in UTC. No future dates or ages above 120.
             * @example 1995-06-15
             */
            dateOfBirth?: string | null;
            /**
             * @description Family name(s). Kept separate from given names.
             * @example Rivera
             */
            lastName?: unknown & unknown;
            /**
             * @description Given name(s). Unicode letters, spaces, apostrophes, periods and hyphens are supported.
             * @example Alex
             */
            name?: unknown & unknown;
            /**
             * @description International E.164 telephone number; formatting is checked, ownership is not verified.
             * @example +34612345678
             */
            phone?: string | null;
            /**
             * @description Postal code. International formats and leading zeros are preserved.
             * @example 28013
             */
            postalCode?: string | null;
            /**
             * @description State, province or administrative region.
             * @example Comunidad de Madrid
             */
            region?: string | null;
        };
        UpdatePublicationDto: {
            /** @description Current expectedVersion. Stale changes return 409. */
            expectedVersion: number;
            profile: {
                /** @description Public locality only; street addresses are never part of the publication. */
                city?: string;
                /** @description Adoption requirements shown publicly and accepted by the applicant. */
                conditions?: string;
                countryCode?: string;
                description?: string;
                title?: string;
            };
            /** @description Decision justification retained in immutable audit. */
            reason: string;
        };
        UpdateResourceDto: {
            /** @description Current aggregate version. Stale writes return 409. */
            expectedVersion: number;
            /** Format: uuid */
            organizationId: string;
            profile: {
                capacity: number;
                /** @enum {string} */
                kind: "appointment" | "lodging";
                name: string;
                /** @enum {string} */
                status: "active" | "inactive";
                windows: {
                    /** @description ISO weekday: Monday 1 through Sunday 7, in America/Bogota. */
                    day: number;
                    endMinute: number;
                    startMinute: number;
                }[];
            };
            /** @description Audited administrative justification; exclude credentials and pet health details. */
            reason: string;
        };
        UpdateServiceDto: {
            /** @description Current aggregate version. Stale writes return 409. */
            expectedVersion: number;
            /** Format: uuid */
            organizationId: string;
            profile: {
                acceptedSpecies: ("dog" | "cat" | "bird" | "rabbit" | "reptile" | "rodent" | "equine" | "other")[];
                bufferAfterMinutes: number;
                bufferBeforeMinutes: number;
                cancellationCutoffMinutes: number;
                /** @enum {string} */
                category: "grooming" | "daycare" | "training" | "lodging" | "veterinary";
                checkInMinute: number | null;
                checkOutMinute: number | null;
                /**
                 * @description Payment is collected by the business. Pettly does not charge this booking online.
                 * @enum {string}
                 */
                collectionMode: "pay_at_business";
                /** @enum {string} */
                confirmationMode: "automatic" | "manual";
                /** @enum {string} */
                currency: "COP";
                description: string;
                durationMinutes: number | null;
                /** @enum {string} */
                kind: "appointment" | "lodging";
                maxNights: number;
                minimumNoticeMinutes: number;
                minNights: number;
                name: string;
                /** @description Tax-inclusive COP minor units: 100 minor units = 1 COP. Per appointment or per night. */
                priceMinor: number;
                requestTtlMinutes: number;
                requirements: string;
                resourceIds: string[];
                terms: string;
                /**
                 * Format: uuid
                 * @description Verified professional credential UUID; required for veterinary appointment services with one dedicated resource.
                 */
                veterinaryCredentialId?: string | null;
            };
            /** @description Audited administrative justification; exclude credentials and pet health details. */
            reason: string;
        };
        UpdateVariantDto: {
            /** @description Current resource version. Stale changes return 409. */
            expectedVersion: number;
            profile: {
                attributes?: {
                    [key: string]: string;
                };
                /**
                 * @description Price in currency minor units (100 minor units = 1 COP/USD/EUR). No floating-point amounts.
                 * @example 1250000
                 */
                priceMinor?: number;
                sku?: string;
            };
            /**
             * @description Audited justification. Do not include credentials.
             * @example Catalog updated after the supplier review.
             */
            reason: string;
        };
        UserAuditPageResponseDto: {
            items: {
                /** @enum {string} */
                action: "user.status_changed" | "user.global_role_granted" | "user.global_role_changed" | "user.created" | "user.invitation_resent" | "user.profile_updated" | "user.email_changed" | "user.deleted";
                /** Format: uuid */
                actorId: string | null;
                /** Format: date-time */
                createdAt: string;
                /** Format: uuid */
                id: string;
                nextValue: string;
                previousValue: string;
                reason: string;
                /** Format: uuid */
                requestId: string | null;
                /** Format: uuid */
                targetId: string;
            }[];
            limit: number;
            page: number;
            total: number;
        };
        UserPageResponseDto: {
            items: {
                /**
                 * @description Street address and building number.
                 * @example Calle Mayor 10
                 */
                address: string | null;
                /**
                 * @description Optional apartment, floor or additional address information.
                 * @example Floor 2, apartment B
                 */
                addressLine2: string | null;
                /**
                 * @description Read-only age calculated from dateOfBirth at response time in UTC.
                 * @example 31
                 */
                age: number | null;
                /**
                 * @description City or locality.
                 * @example Madrid
                 */
                city: string | null;
                /**
                 * @description Uppercase ISO 3166-1 alpha-2 country code.
                 * @example ES
                 * @enum {string|null}
                 */
                countryCode: "AD" | "AE" | "AF" | "AG" | "AI" | "AL" | "AM" | "AO" | "AQ" | "AR" | "AS" | "AT" | "AU" | "AW" | "AX" | "AZ" | "BA" | "BB" | "BD" | "BE" | "BF" | "BG" | "BH" | "BI" | "BJ" | "BL" | "BM" | "BN" | "BO" | "BQ" | "BR" | "BS" | "BT" | "BV" | "BW" | "BY" | "BZ" | "CA" | "CC" | "CD" | "CF" | "CG" | "CH" | "CI" | "CK" | "CL" | "CM" | "CN" | "CO" | "CR" | "CU" | "CV" | "CW" | "CX" | "CY" | "CZ" | "DE" | "DJ" | "DK" | "DM" | "DO" | "DZ" | "EC" | "EE" | "EG" | "EH" | "ER" | "ES" | "ET" | "FI" | "FJ" | "FK" | "FM" | "FO" | "FR" | "GA" | "GB" | "GD" | "GE" | "GF" | "GG" | "GH" | "GI" | "GL" | "GM" | "GN" | "GP" | "GQ" | "GR" | "GS" | "GT" | "GU" | "GW" | "GY" | "HK" | "HM" | "HN" | "HR" | "HT" | "HU" | "ID" | "IE" | "IL" | "IM" | "IN" | "IO" | "IQ" | "IR" | "IS" | "IT" | "JE" | "JM" | "JO" | "JP" | "KE" | "KG" | "KH" | "KI" | "KM" | "KN" | "KP" | "KR" | "KW" | "KY" | "KZ" | "LA" | "LB" | "LC" | "LI" | "LK" | "LR" | "LS" | "LT" | "LU" | "LV" | "LY" | "MA" | "MC" | "MD" | "ME" | "MF" | "MG" | "MH" | "MK" | "ML" | "MM" | "MN" | "MO" | "MP" | "MQ" | "MR" | "MS" | "MT" | "MU" | "MV" | "MW" | "MX" | "MY" | "MZ" | "NA" | "NC" | "NE" | "NF" | "NG" | "NI" | "NL" | "NO" | "NP" | "NR" | "NU" | "NZ" | "OM" | "PA" | "PE" | "PF" | "PG" | "PH" | "PK" | "PL" | "PM" | "PN" | "PR" | "PS" | "PT" | "PW" | "PY" | "QA" | "RE" | "RO" | "RS" | "RU" | "RW" | "SA" | "SB" | "SC" | "SD" | "SE" | "SG" | "SH" | "SI" | "SJ" | "SK" | "SL" | "SM" | "SN" | "SO" | "SR" | "SS" | "ST" | "SV" | "SX" | "SY" | "SZ" | "TC" | "TD" | "TF" | "TG" | "TH" | "TJ" | "TK" | "TL" | "TM" | "TN" | "TO" | "TR" | "TT" | "TV" | "TW" | "TZ" | "UA" | "UG" | "UM" | "US" | "UY" | "UZ" | "VA" | "VC" | "VE" | "VG" | "VI" | "VN" | "VU" | "WF" | "WS" | "YE" | "YT" | "ZA" | "ZM" | "ZW" | null;
                /** Format: date-time */
                createdAt: string;
                /**
                 * Format: date
                 * @description Date of birth as YYYY-MM-DD; age is calculated from this value in UTC. No future dates or ages above 120.
                 * @example 1995-06-15
                 */
                dateOfBirth: string | null;
                /** Format: date-time */
                deletedAt: string | null;
                /** Format: email */
                email: string;
                /** Format: date-time */
                emailVerifiedAt: string | null;
                /**
                 * @description Platform role assigned only by a super administrator. Company and adoption roles are scoped organization memberships. Registration always starts with user.
                 * @enum {string}
                 */
                globalRole: "user" | "moderator" | "super_admin";
                /** Format: uuid */
                id: string;
                /**
                 * @description Family name(s). Kept separate from given names.
                 * @example Rivera
                 */
                lastName: (string & (unknown & unknown)) | null;
                /**
                 * @description Given name(s). Existing pre-migration names are preserved without guessing a surname.
                 * @example Alex
                 */
                name: string;
                /**
                 * @description International E.164 telephone number; formatting is checked, ownership is not verified.
                 * @example +34612345678
                 */
                phone: string | null;
                /**
                 * @description Postal code. International formats and leading zeros are preserved.
                 * @example 28013
                 */
                postalCode: string | null;
                /**
                 * @description State, province or administrative region.
                 * @example Comunidad de Madrid
                 */
                region: string | null;
                /** @enum {string} */
                status: "active" | "disabled" | "deleted";
                /** Format: date-time */
                updatedAt: string;
            }[];
            limit: number;
            page: number;
            total: number;
        };
        UserResponseDto: {
            /**
             * @description Street address and building number.
             * @example Calle Mayor 10
             */
            address: string | null;
            /**
             * @description Optional apartment, floor or additional address information.
             * @example Floor 2, apartment B
             */
            addressLine2: string | null;
            /**
             * @description Read-only age calculated from dateOfBirth at response time in UTC.
             * @example 31
             */
            age: number | null;
            /**
             * @description City or locality.
             * @example Madrid
             */
            city: string | null;
            /**
             * @description Uppercase ISO 3166-1 alpha-2 country code.
             * @example ES
             * @enum {string|null}
             */
            countryCode: "AD" | "AE" | "AF" | "AG" | "AI" | "AL" | "AM" | "AO" | "AQ" | "AR" | "AS" | "AT" | "AU" | "AW" | "AX" | "AZ" | "BA" | "BB" | "BD" | "BE" | "BF" | "BG" | "BH" | "BI" | "BJ" | "BL" | "BM" | "BN" | "BO" | "BQ" | "BR" | "BS" | "BT" | "BV" | "BW" | "BY" | "BZ" | "CA" | "CC" | "CD" | "CF" | "CG" | "CH" | "CI" | "CK" | "CL" | "CM" | "CN" | "CO" | "CR" | "CU" | "CV" | "CW" | "CX" | "CY" | "CZ" | "DE" | "DJ" | "DK" | "DM" | "DO" | "DZ" | "EC" | "EE" | "EG" | "EH" | "ER" | "ES" | "ET" | "FI" | "FJ" | "FK" | "FM" | "FO" | "FR" | "GA" | "GB" | "GD" | "GE" | "GF" | "GG" | "GH" | "GI" | "GL" | "GM" | "GN" | "GP" | "GQ" | "GR" | "GS" | "GT" | "GU" | "GW" | "GY" | "HK" | "HM" | "HN" | "HR" | "HT" | "HU" | "ID" | "IE" | "IL" | "IM" | "IN" | "IO" | "IQ" | "IR" | "IS" | "IT" | "JE" | "JM" | "JO" | "JP" | "KE" | "KG" | "KH" | "KI" | "KM" | "KN" | "KP" | "KR" | "KW" | "KY" | "KZ" | "LA" | "LB" | "LC" | "LI" | "LK" | "LR" | "LS" | "LT" | "LU" | "LV" | "LY" | "MA" | "MC" | "MD" | "ME" | "MF" | "MG" | "MH" | "MK" | "ML" | "MM" | "MN" | "MO" | "MP" | "MQ" | "MR" | "MS" | "MT" | "MU" | "MV" | "MW" | "MX" | "MY" | "MZ" | "NA" | "NC" | "NE" | "NF" | "NG" | "NI" | "NL" | "NO" | "NP" | "NR" | "NU" | "NZ" | "OM" | "PA" | "PE" | "PF" | "PG" | "PH" | "PK" | "PL" | "PM" | "PN" | "PR" | "PS" | "PT" | "PW" | "PY" | "QA" | "RE" | "RO" | "RS" | "RU" | "RW" | "SA" | "SB" | "SC" | "SD" | "SE" | "SG" | "SH" | "SI" | "SJ" | "SK" | "SL" | "SM" | "SN" | "SO" | "SR" | "SS" | "ST" | "SV" | "SX" | "SY" | "SZ" | "TC" | "TD" | "TF" | "TG" | "TH" | "TJ" | "TK" | "TL" | "TM" | "TN" | "TO" | "TR" | "TT" | "TV" | "TW" | "TZ" | "UA" | "UG" | "UM" | "US" | "UY" | "UZ" | "VA" | "VC" | "VE" | "VG" | "VI" | "VN" | "VU" | "WF" | "WS" | "YE" | "YT" | "ZA" | "ZM" | "ZW" | null;
            /** Format: date-time */
            createdAt: string;
            /**
             * Format: date
             * @description Date of birth as YYYY-MM-DD; age is calculated from this value in UTC. No future dates or ages above 120.
             * @example 1995-06-15
             */
            dateOfBirth: string | null;
            /** Format: date-time */
            deletedAt: string | null;
            /** Format: email */
            email: string;
            /** Format: date-time */
            emailVerifiedAt: string | null;
            /**
             * @description Platform role assigned only by a super administrator. Company and adoption roles are scoped organization memberships. Registration always starts with user.
             * @enum {string}
             */
            globalRole: "user" | "moderator" | "super_admin";
            /** Format: uuid */
            id: string;
            /**
             * @description Family name(s). Kept separate from given names.
             * @example Rivera
             */
            lastName: (string & (unknown & unknown)) | null;
            /**
             * @description Given name(s). Existing pre-migration names are preserved without guessing a surname.
             * @example Alex
             */
            name: string;
            /**
             * @description International E.164 telephone number; formatting is checked, ownership is not verified.
             * @example +34612345678
             */
            phone: string | null;
            /**
             * @description Postal code. International formats and leading zeros are preserved.
             * @example 28013
             */
            postalCode: string | null;
            /**
             * @description State, province or administrative region.
             * @example Comunidad de Madrid
             */
            region: string | null;
            /** @enum {string} */
            status: "active" | "disabled" | "deleted";
            /** Format: date-time */
            updatedAt: string;
        };
        UserRoleResponseDto: {
            /** @enum {string} */
            globalRole: "user" | "moderator" | "super_admin";
            /** Format: uuid */
            id: string;
            /** Format: date-time */
            updatedAt: string;
        };
        UserStatusResponseDto: {
            /** Format: uuid */
            id: string;
            /** @enum {string} */
            status: "active" | "disabled";
            /** Format: date-time */
            updatedAt: string;
        };
        VariantChangeResponseDto: {
            product: {
                brand: string | null;
                /** Format: uuid */
                categoryId: string;
                /** Format: date-time */
                createdAt: string;
                /** Format: uuid */
                createdBy: string;
                /** @enum {string} */
                currency: "COP" | "USD" | "EUR";
                description: string;
                /** Format: uuid */
                id: string;
                name: string;
                /** Format: uuid */
                organizationId: string;
                /** Format: date-time */
                reviewedAt: string | null;
                /** Format: uuid */
                reviewedBy: string | null;
                reviewReason: string | null;
                /** @enum {string} */
                status: "draft" | "pending" | "published" | "rejected" | "paused" | "archived";
                /** Format: date-time */
                updatedAt: string;
                version: number;
            };
            variant: {
                attributes: {
                    [key: string]: string;
                };
                /** Format: date-time */
                createdAt: string;
                /** Format: uuid */
                id: string;
                /** Format: uuid */
                organizationId: string;
                priceMinor: number;
                /** Format: uuid */
                productId: string;
                sku: string;
                /** @enum {string} */
                status: "active" | "archived";
                /** Format: date-time */
                updatedAt: string;
            };
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    getApiStatus: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiStatusResponseDto"];
                };
            };
        };
    };
    listAdoptionModerationQueue: {
        parameters: {
            query?: {
                limit?: number;
                page?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PrivatePublicationsResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    listManagedAdoptionPublications: {
        parameters: {
            query?: {
                limit?: number;
                page?: number;
                status?: "draft" | "pending" | "published" | "rejected" | "paused" | "closed" | "deleted";
            };
            header?: never;
            path: {
                organizationId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PrivatePublicationsResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    listPublicAdoptions: {
        parameters: {
            query?: {
                city?: string;
                countryCode?: string;
                /** @description Opaque last-scanned publication UUID from nextCursor. Continue until nextCursor is null; filtered pages can contain fewer results. */
                cursor?: string;
                limit?: number;
                search?: string;
                species?: "dog" | "cat" | "bird" | "rabbit" | "reptile" | "rodent" | "equine" | "other";
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PublicPublicationsResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    createAdoptionPublication: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreatePublicationDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PublicationResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    getPublicAdoption: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                publicationId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PublicPublicationResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    archiveAdoptionPublication: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                publicationId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PublicationDecisionDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PublicationDeletedDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    updateAdoptionPublication: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                publicationId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdatePublicationDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PublicationResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    listAdoptionAudit: {
        parameters: {
            query?: {
                limit?: number;
                page?: number;
            };
            header?: never;
            path: {
                publicationId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AdoptionAuditResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    getManagedAdoptionPublication: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                publicationId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PublicationResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    getManagedAdoptionPhoto: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mediaId: string;
                publicationId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "image/jpeg": string;
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    pauseAdoptionPublication: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                publicationId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PublicationDecisionDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PublicationResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    getPublicAdoptionPhoto: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mediaId: string;
                publicationId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "image/jpeg": string;
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    listShelterAdoptionRequests: {
        parameters: {
            query?: {
                limit?: number;
                page?: number;
                status?: "submitted" | "in_review" | "approved" | "rejected" | "withdrawn" | "completed" | "closed";
            };
            header?: never;
            path: {
                publicationId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AdoptionRequestsResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    submitAdoptionRequest: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                publicationId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SubmitAdoptionRequestDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AdoptionRequestResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    reviewAdoptionPublication: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                publicationId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ReviewPublicationDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PublicationResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    submitAdoptionPublication: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                publicationId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PublicationDecisionDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PublicationResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    getAdoptionRequest: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                adoptionRequestId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AdoptionRequestDetailDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    completeAdoptionRequest: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                adoptionRequestId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AdoptionRequestDecisionDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AdoptionRequestResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    reviewAdoptionRequest: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                adoptionRequestId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ReviewAdoptionRequestDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AdoptionRequestResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    withdrawAdoptionRequest: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                adoptionRequestId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AdoptionRequestDecisionDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AdoptionRequestResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    listMyAdoptionRequests: {
        parameters: {
            query?: {
                limit?: number;
                page?: number;
                status?: "submitted" | "in_review" | "approved" | "rejected" | "withdrawn" | "completed" | "closed";
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AdoptionRequestsResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    listAnimals: {
        parameters: {
            query?: {
                limit?: number;
                organizationId?: string;
                page?: number;
                search?: string;
                species?: "dog" | "cat" | "bird" | "rabbit" | "reptile" | "rodent" | "equine" | "other";
                status?: "active" | "adopted" | "deceased" | "archived";
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AnimalsPageDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    createAnimal: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateAnimalDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AnimalResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    getAnimal: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                animalId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AnimalDetailDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    archiveAnimal: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                animalId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AnimalDecisionDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AnimalResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    updateAnimal: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                animalId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateAnimalDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AnimalResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    listAnimalAudit: {
        parameters: {
            query?: {
                limit?: number;
                page?: number;
            };
            header?: never;
            path: {
                animalId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AnimalAuditDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    uploadAnimalPhoto: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                animalId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": {
                    expectedVersion: number;
                    /**
                     * Format: binary
                     * @description Single-frame JPEG/PNG/WebP, at most 5 MiB and 20 megapixels.
                     */
                    file: string;
                    reason: string;
                };
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AnimalDetailDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Upload exceeds the multipart size limit. */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    getPrivateAnimalPhoto: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                animalId: string;
                mediaId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "image/jpeg": string;
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    removeAnimalPhoto: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                animalId: string;
                mediaId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AnimalDecisionDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AnimalResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    updateAnimalStatus: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                animalId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AnimalStatusDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AnimalResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    acceptInvitation: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AcceptInvitationRequestDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MessageResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    deleteOwnAccount: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["DeleteAccountRequestDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MessageResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    requestEmailChange: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ChangeEmailRequestDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MessageResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    changePassword: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ChangePasswordRequestDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MessageResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    confirmEmailChange: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ActionTokenRequestDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MessageResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    forgotPassword: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EmailRequestDto"];
            };
        };
        responses: {
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MessageResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    login: {
        parameters: {
            query?: never;
            header?: {
                /** @description Set to 1 for web clients. An allowed Origin is also required. */
                "X-CSRF-Protection"?: string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["LoginRequestDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    logout: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MessageResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    logoutAll: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MessageResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    refreshSession: {
        parameters: {
            query?: never;
            header?: {
                /** @description Set to 1 with an allowed Origin when using the refresh cookie. */
                "X-CSRF-Protection"?: string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RefreshRequestDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    register: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RegisterRequestDto"];
            };
        };
        responses: {
            /** @description Account created; verification email scheduled. */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MessageResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    resendVerification: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EmailRequestDto"];
            };
        };
        responses: {
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MessageResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    resetPassword: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ResetPasswordRequestDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MessageResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    listOwnSessions: {
        parameters: {
            query?: {
                /** @description Page size, from 1 to 100. */
                limit?: number;
                /** @description One-based page number. */
                page?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SessionPageResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    revokeOwnSession: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description UUID of a session owned by the current account. */
                sessionId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MessageResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    verifyEmail: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ActionTokenRequestDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MessageResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    getCurrentUserAccess: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AccessResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    getRoleCatalog: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RolesResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    getUserAccessAsAdministrator: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                userId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AccessResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    listOwnBookings: {
        parameters: {
            query?: {
                limit?: number;
                page?: number;
                serviceId?: string;
                status?: "requested" | "confirmed" | "in_progress" | "completed" | "cancelled" | "rejected" | "expired" | "no_show";
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BookingsResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    createBooking: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateBookingDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BookingResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    getOwnBooking: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                bookingId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BookingResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    listOwnBookingAudit: {
        parameters: {
            query?: {
                limit?: number;
                page?: number;
            };
            header?: never;
            path: {
                bookingId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BookingAuditResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    cancelOwnBooking: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                bookingId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["BookingDecisionDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BookingResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    rescheduleOwnBooking: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                bookingId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RescheduleBookingDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BookingResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    listManagedBookings: {
        parameters: {
            query: {
                limit?: number;
                organizationId: string;
                page?: number;
                /** @description Case-insensitive literal search in accepted service, pet or contact names. Scoped to the explicit business. */
                search?: string;
                serviceId?: string;
                status?: "requested" | "confirmed" | "in_progress" | "completed" | "cancelled" | "rejected" | "expired" | "no_show";
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BookingsResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    getManagedBooking: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                bookingId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BookingResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    listManagedBookingAudit: {
        parameters: {
            query?: {
                limit?: number;
                page?: number;
            };
            header?: never;
            path: {
                bookingId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BookingAuditResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    cancelManagedBooking: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                bookingId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["BookingDecisionDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BookingResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    completeManagedBooking: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                bookingId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["BookingDecisionDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BookingResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    confirmManagedBooking: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                bookingId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["BookingDecisionDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BookingResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    no_showManagedBooking: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                bookingId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["BookingDecisionDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BookingResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    rejectManagedBooking: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                bookingId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["BookingDecisionDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BookingResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    startManagedBooking: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                bookingId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["BookingDecisionDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BookingResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    getOwnCart: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CartResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    clearOwnCart: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CartVersionDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CartResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    putOwnCartItem: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                variantId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PutCartItemDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CartResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    removeOwnCartItem: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                variantId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CartVersionDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CartResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    listManagedCategories: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CategoriesResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    createProductCategory: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateCategoryDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CategoryResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    updateProductCategory: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                categoryId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateCategoryDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CategoryResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    listCategoryAudit: {
        parameters: {
            query?: {
                limit?: number;
                page?: number;
            };
            header?: never;
            path: {
                categoryId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CatalogAuditResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    listProductModerationQueue: {
        parameters: {
            query?: {
                brand?: string;
                categoryId?: string;
                currency?: "COP" | "USD" | "EUR";
                limit?: number;
                maxPriceMinor?: number;
                minPriceMinor?: number;
                organizationId?: string;
                page?: number;
                search?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ModerationProductsResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    getProductReviewPreview: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                productId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PrivateProductDetailDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    getProductReviewPhoto: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mediaId: string;
                productId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "image/jpeg": string;
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    listManagedProducts: {
        parameters: {
            query: {
                brand?: string;
                categoryId?: string;
                currency?: "COP" | "USD" | "EUR";
                limit?: number;
                maxPriceMinor?: number;
                minPriceMinor?: number;
                organizationId: string;
                page?: number;
                search?: string;
                status?: "draft" | "pending" | "published" | "rejected" | "paused" | "archived";
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PrivateProductsResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    createCatalogProduct: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateProductDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProductResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    getManagedProduct: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                productId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PrivateProductDetailDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    archiveCatalogProduct: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                productId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ProductDecisionDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProductResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    updateCatalogProduct: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                productId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateProductDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProductResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    listProductAudit: {
        parameters: {
            query?: {
                limit?: number;
                page?: number;
            };
            header?: never;
            path: {
                productId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CatalogAuditResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    pauseCatalogProduct: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                productId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ProductDecisionDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProductResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    uploadProductPhoto: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                productId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": {
                    expectedVersion: number;
                    /** Format: binary */
                    file: string;
                    reason: string;
                };
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PhotoChangeResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Uploaded file exceeds five MiB. */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    getManagedProductPhoto: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mediaId: string;
                productId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "image/jpeg": string;
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    removeProductPhoto: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mediaId: string;
                productId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ProductDecisionDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProductResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    reviewCatalogProduct: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                productId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ProductReviewDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProductResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    submitCatalogProduct: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                productId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ProductDecisionDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProductResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    createProductVariant: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                productId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateVariantDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["VariantChangeResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    archiveProductVariant: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                productId: string;
                variantId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ProductDecisionDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["VariantChangeResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    updateProductVariant: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                productId: string;
                variantId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateVariantDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["VariantChangeResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    listPublicCategories: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CategoriesResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    listPublicProducts: {
        parameters: {
            query?: {
                brand?: string;
                categoryId?: string;
                currency?: "COP" | "USD" | "EUR";
                limit?: number;
                maxPriceMinor?: number;
                minPriceMinor?: number;
                organizationId?: string;
                page?: number;
                search?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PublicProductsResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    getPublicProduct: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                productId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PublicProductDetailDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    getPublicProductPhoto: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                mediaId: string;
                productId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "image/jpeg": string;
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    createCheckoutQuote: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["QuoteRequestDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["QuoteResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    getOwnCheckoutQuote: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                quoteId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["QuoteResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    getApiLiveness: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HealthDto"];
                };
            };
        };
    };
    getApiReadiness: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HealthDto"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HealthDto"];
                };
            };
        };
    };
    getPublicInventoryAvailability: {
        parameters: {
            query: {
                /** @description Comma-separated variant UUIDs; maximum fifty. Unavailable products are omitted. */
                variantIds: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AvailabilityResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    getManagedInventoryHold: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                holdId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HoldResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    consumeInventoryHold: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                holdId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["HoldDecisionDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HoldChangeResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    releaseInventoryHold: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                holdId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["HoldDecisionDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HoldChangeResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    listManagedInventory: {
        parameters: {
            query: {
                limit?: number;
                /** @description Exact owning active business UUID; inventory.manage required in this scope. */
                organizationId: string;
                page?: number;
                search?: string;
                status?: "active" | "archived";
                /** @description Optional exact variant UUID for a scoped detail lookup. */
                variantId?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["InventoryListResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    getManagedStock: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                variantId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StockResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    createInventoryHold: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                variantId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateHoldDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HoldChangeResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    listInventoryMovements: {
        parameters: {
            query?: {
                limit?: number;
                page?: number;
            };
            header?: never;
            path: {
                variantId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MovementsResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    recordInventoryMovement: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                variantId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["StockMovementDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MovementChangeResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    getOperationalMetrics: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            /** @description Metrics are disabled or dependencies unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    listOwnNotifications: {
        parameters: {
            query?: {
                category?: "orders" | "adoptions" | "organizations" | "bookings";
                limit?: number;
                page?: number;
                unreadOnly?: "true" | "false";
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["InboxNotificationsDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    readOwnNotification: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                notificationId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EmptyNotificationDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["InboxNotificationDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    retryFailedNotificationDelivery: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                deliveryId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RetryDeliveryDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["NotificationDeliveryDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    listFailedNotificationDeliveries: {
        parameters: {
            query?: {
                limit?: number;
                page?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["FailedNotificationDeliveriesDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    getOwnNotificationPreferences: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["NotificationPreferencesDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    changeOwnNotificationPreferences: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PreferencesDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["NotificationPreferencesDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    readAllOwnNotifications: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ReadAllNotificationsDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ReadAllNotificationsResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    countOwnUnreadNotifications: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UnreadNotificationsDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    listVisibleOrders: {
        parameters: {
            query?: {
                limit?: number;
                organizationId?: string;
                page?: number;
                /** @description Literal case-insensitive search in accepted recipient/city, or an exact order UUID. Applied within the authorized buyer/business scope. */
                search?: string;
                status?: "awaiting_payment" | "paid" | "preparing" | "dispatched" | "ready_for_pickup" | "delivered" | "cancelled" | "expired";
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OrdersResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    createOwnOrder: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateOrderDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OrderResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    getVisibleOrder: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                orderId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OrderResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    listVisibleOrderAudits: {
        parameters: {
            query?: {
                limit?: number;
                page?: number;
            };
            header?: never;
            path: {
                orderId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OrderAuditsResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    cancelUnpaidOrder: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                orderId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CancelOrderDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OrderResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    advanceOrderFulfillment: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                orderId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["FulfillOrderDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OrderResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    createOwnPaymentAttempt: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                orderId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreatePaymentDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaymentResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    listOrganizations: {
        parameters: {
            query?: {
                countryCode?: string;
                limit?: number;
                page?: number;
                search?: string;
                status?: "draft" | "pending" | "active" | "rejected" | "suspended" | "deleted";
                type?: "business" | "adoption_entity";
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OrganizationPageResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    createOrganization: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateOrganizationRequestDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OrganizationResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    getOrganization: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                organizationId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OrganizationResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    archiveOrganization: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                organizationId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["OrganizationDecisionDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OrganizationDeletedDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    approveOrganization: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                organizationId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["OrganizationResponsibleDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OrganizationProfileResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    listOrganizationAudit: {
        parameters: {
            query?: {
                limit?: number;
                page?: number;
            };
            header?: never;
            path: {
                organizationId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OrganizationAuditResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    listOrganizationMembers: {
        parameters: {
            query?: {
                limit?: number;
                page?: number;
            };
            header?: never;
            path: {
                organizationId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OrganizationMembersResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    assignOrganizationRole: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                organizationId: string;
                userId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AssignMembershipRequestDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MembershipResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    removeOrganizationRole: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                organizationId: string;
                userId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RemoveMembershipRequestDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MembershipRemovedResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    getCommercialPolicy: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                organizationId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PolicyResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    configureCommercialPolicy: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                organizationId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ConfigurePolicyDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PolicyResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    listCommercialPolicyAudits: {
        parameters: {
            query?: {
                limit?: number;
                page?: number;
            };
            header?: never;
            path: {
                organizationId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PolicyAuditsResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    getOrganizationProfile: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                organizationId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OrganizationProfileResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    updateOrganizationProfile: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                organizationId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateOrganizationProfileDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OrganizationProfileResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    rejectOrganization: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                organizationId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["OrganizationDecisionDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OrganizationProfileResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    transferOrganizationResponsibility: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                organizationId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["OrganizationResponsibleDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OrganizationProfileResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    updateOrganizationStatus: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                organizationId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["OrganizationStatusDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OrganizationProfileResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    submitOrganization: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                organizationId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["OrganizationDecisionDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OrganizationProfileResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    listMyOrganizations: {
        parameters: {
            query?: {
                countryCode?: string;
                limit?: number;
                page?: number;
                search?: string;
                status?: "draft" | "pending" | "active" | "rejected" | "suspended" | "deleted";
                type?: "business" | "adoption_entity";
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OrganizationPageResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    requestOrganization: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RequestOrganizationDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OrganizationProfileResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    listVisiblePayments: {
        parameters: {
            query?: {
                limit?: number;
                organizationId?: string;
                page?: number;
                scope?: "own" | "platform";
                status?: "created" | "processing" | "pending" | "approved" | "declined" | "cancelled" | "expired" | "reconciliation_required";
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaymentsResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    getVisiblePayment: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                paymentId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaymentResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    getPaymentFinancialEvidence: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                paymentId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaymentFinancialsResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    listVisiblePaymentHistory: {
        parameters: {
            query?: {
                limit?: number;
                page?: number;
            };
            header?: never;
            path: {
                paymentId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaymentHistoryResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    requestPaymentReconciliation: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                paymentId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ReconcilePaymentDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaymentResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    getPaymentPolicy: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaymentPolicyResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    listPublicServices: {
        parameters: {
            query?: {
                category?: "grooming" | "daycare" | "training" | "lodging" | "veterinary";
                kind?: "appointment" | "lodging";
                limit?: number;
                organizationId?: string;
                page?: number;
                search?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PublicServicesDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    getPublicService: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                serviceId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PublicServiceDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    getServiceAvailability: {
        parameters: {
            query: {
                from: string;
                nights?: number;
                resourceId: string;
                to: string;
            };
            header?: never;
            path: {
                serviceId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ServiceAvailabilityResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    listPublicServiceResources: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                serviceId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ResourcesDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    listManagedServices: {
        parameters: {
            query: {
                category?: "grooming" | "daycare" | "training" | "lodging" | "veterinary";
                kind?: "appointment" | "lodging";
                limit?: number;
                organizationId: string;
                page?: number;
                search?: string;
                status?: "draft" | "pending" | "published" | "rejected" | "paused" | "archived";
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ManagedServicesDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    createService: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateServiceDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ServiceResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    getManagedService: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                serviceId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ServiceResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    archiveService: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                serviceId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["DecisionDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ServiceResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    updateService: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                serviceId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateServiceDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ServiceResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    listServiceAudit: {
        parameters: {
            query?: {
                limit?: number;
                page?: number;
            };
            header?: never;
            path: {
                serviceId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ServiceAuditsDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    pauseService: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                serviceId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["DecisionDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ServiceResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    reviewService: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                serviceId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ReviewDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ServiceResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    submitService: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                serviceId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["DecisionDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ServiceResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    listServiceModerationQueue: {
        parameters: {
            query?: {
                limit?: number;
                page?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ManagedServicesDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    getServiceReviewPreview: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                serviceId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ServiceResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    listManagedServiceResources: {
        parameters: {
            query: {
                organizationId: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ResourcesDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    createServiceResource: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateResourceDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ResourceResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    updateServiceResource: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                resourceId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateResourceDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ResourceResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    listServiceResourceAudit: {
        parameters: {
            query?: {
                limit?: number;
                page?: number;
            };
            header?: never;
            path: {
                resourceId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ServiceAuditsDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    listActiveServiceBlocks: {
        parameters: {
            query: {
                from: string;
                to: string;
            };
            header?: never;
            path: {
                resourceId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ActiveServiceBlocksDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    blockServiceResource: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                resourceId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["BlockDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BlockResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    releaseServiceBlock: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                blockId: string;
                resourceId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["DecisionDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BlockResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    listUsers: {
        parameters: {
            query?: {
                emailVerified?: "true" | "false";
                /** @description Page size, from 1 to 100. */
                limit?: number;
                organizationRole?: "business_admin" | "business_operator" | "adoption_admin" | "adoption_operator";
                /** @description One-based page number. */
                page?: number;
                role?: "user" | "moderator" | "super_admin";
                search?: string;
                sortBy?: "createdAt" | "email" | "name";
                sortOrder?: "asc" | "desc";
                status?: "active" | "disabled" | "deleted";
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UserPageResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    inviteUserAsAdministrator: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["InviteUserRequestDto"];
            };
        };
        responses: {
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UserResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    getUserAsAdministrator: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description UUID of the account to administer. */
                userId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UserResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    deleteUserAsAdministrator: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description UUID of the account to administer. */
                userId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["DeleteUserRequestDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AdministrationMessageResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    updateUserAsAdministrator: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description UUID of the account to administer. */
                userId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AdminUpdateUserRequestDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UserResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    listUserAuditAsAdministrator: {
        parameters: {
            query?: {
                /** @description Page size, from 1 to 100. */
                limit?: number;
                /** @description One-based page number. */
                page?: number;
            };
            header?: never;
            path: {
                /** @description UUID of the account to administer. */
                userId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UserAuditPageResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    resendInvitationAsAdministrator: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description UUID of the account to administer. */
                userId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ResendInvitationRequestDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AdministrationMessageResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    changeUserGlobalRole: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description UUID of the account to administer. */
                userId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ChangeUserRoleRequestDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UserRoleResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    changeUserStatus: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description UUID of the account to administer. */
                userId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ChangeUserStatusRequestDto"];
            };
        };
        responses: {
            /** @description Resulting account state. No private profile fields are exposed. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UserStatusResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    getCurrentUser: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UserResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    updateCurrentUser: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateProfileRequestDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UserResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    listVeterinaryCredentials: {
        parameters: {
            query?: {
                limit?: number;
                organizationId?: string;
                page?: number;
                status?: "draft" | "pending" | "approved" | "rejected" | "revoked";
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CredentialsResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    createVeterinaryCredential: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateCredentialDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CredentialResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    getVeterinaryCredential: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                credentialId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CredentialResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    configureVeterinaryCredential: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                credentialId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ConfigureCredentialDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CredentialResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    listVeterinaryCredentialAudit: {
        parameters: {
            query?: {
                limit?: number;
                page?: number;
            };
            header?: never;
            path: {
                credentialId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CredentialAuditsDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    uploadVeterinaryEvidence: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                credentialId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": {
                    expectedVersion: number;
                    /** Format: binary */
                    file: string;
                    /** @enum {string} */
                    kind: "professional_card" | "qualification" | "standing_certificate";
                    reason: string;
                };
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CredentialResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    readVeterinaryEvidence: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                credentialId: string;
                mediaId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "image/jpeg": string;
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    removeVeterinaryEvidence: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                credentialId: string;
                mediaId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CredentialDecisionDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CredentialResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    reviewVeterinaryCredential: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                credentialId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ReviewCredentialDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CredentialResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    revokeVeterinaryCredential: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                credentialId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CredentialDecisionDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CredentialResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    submitVeterinaryCredential: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                credentialId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CredentialDecisionDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CredentialResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    listEligibleVeterinaryCredentials: {
        parameters: {
            query: {
                limit?: number;
                organizationId: string;
                page?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EligibleCredentialsResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
    listOwnVeterinaryCredentials: {
        parameters: {
            query?: {
                limit?: number;
                organizationId?: string;
                page?: number;
                status?: "draft" | "pending" | "approved" | "rejected" | "revoked";
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CredentialsResponseDto"];
                };
            };
            /** @description Invalid request or action token. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Missing, expired or revoked authentication. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Email verification or the required authorization is missing. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Resource was not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description The operation conflicts with a resource or authorization invariant. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description Rate limit exceeded. Retry-After specifies seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description An unexpected internal error occurred. Use requestId for support. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
            /** @description A required dependency is unavailable. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponseDto"];
                };
            };
        };
    };
}
