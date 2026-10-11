# Backoffice account and access recovery

Implemented in the independent `account` and `auth` features. `/cuenta` is available to authenticated backoffice identities. A plain customer without staff/global permissions cannot enter the administrative shell; accepting an invitation never assigns a privileged role. A superadministrator must assign the appropriate global role or organization membership.

## Own account

The user can edit names, birth date, E.164 phone and address fields. Email, status and roles are excluded from profile requests. Country codes and dates are validated with Zod Mini and typed Reactive Forms. Profile changes reload the identity from the API so navigation and the displayed name agree with the account.

The security form explicitly selects one action and requires confirmation: change password, request email change, revoke a visible own session, revoke all sessions or irreversibly anonymize the account. Passwords are never trimmed, placed in URLs or stored in browser storage. Password changes, confirmed email changes, own account deletion, all-session logout and current-session revocation close the session. The API protects the last active superadministrator and current organization responsibility.

Sessions are paged, distinguish the current session, and contain only API-provided timestamps and IDs. The API remains authoritative for ownership. Mutation submissions are serialized; uncertain outcomes, version conflicts and server errors block another write until explicit refresh. A response from before a refresh cannot restore personal state or execute a stale sign-out.

## Email action pages

- `/forgot-password`: generic acknowledgement; no account enumeration.
- `/reset-password#token=…`: a new matching password, 12–128 characters.
- `/verify-email#token=…`: explicit email verification.
- `/resend-verification`: generic acknowledgement.
- `/accept-invitation#token=…`: activate an invited account and choose a password.
- `/confirm-email-change#token=…`: confirm a pending email change.

Pages accept the actual SMTP links. Tokens are captured in memory and removed from the current URL with `replaceUrl`; they are not submitted automatically. The backend enforces expiry and one-time use. Failed or uncertain one-time operations are not replayed automatically. Public pages use the same accessible design tokens and safe problem presentation as the shell.

`WEB_PUBLIC_URL` currently targets the backoffice (`http://localhost:4300` in local Docker). API and worker must agree on this origin. Configure a real HTTPS origin outside local development. When the customer web implements these email flows, route links to that verified application deliberately; the existing Next.js scaffold is not an email-action implementation.

## Architecture and verification

Generated OpenAPI requests/responses → scoped HTTP gateway → Zod mapper → page-provided NgRx SignalStore → OnPush presentational forms. Signals, zoneless Angular, lazy route components and Tailwind 4 remain mandatory. No account feature imports the users administration feature.

Unit tests cover failed profile loads, duplicate writes, uncertain response suppression, stale writes after refresh and confirmed session clearing. The real browser suite exercises invitation activation, profile editing, all-session logout and password recovery through the isolated worker/Mailpit, with accessibility and mobile overflow checks.

## Manual checks

1. Invite a new account as superadministrator; open its email link and set a password. Verify that it receives no privileged access by default.
2. Assign its authorized staff role, sign in and edit its own profile in Account.
3. Open a second session, refresh the session list and revoke that session or all sessions.
4. Recover a password through the email link; retrying a consumed token must fail.
5. Request a new email with the current password; the current address remains valid until confirmation, which closes existing sessions.
6. Use an expendable account for deletion; verify that historical references survive and login no longer works.
