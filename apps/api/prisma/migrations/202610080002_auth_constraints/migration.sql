ALTER TABLE "notification_outbox" ADD COLUMN "correlationKey" CHAR(64);
CREATE INDEX "notification_outbox_correlationKey_idx" ON "notification_outbox"("correlationKey");
ALTER TABLE "users" ADD CONSTRAINT "users_normalized_email" CHECK ("email" = lower(btrim("email")));
ALTER TABLE "users" ADD CONSTRAINT "users_status" CHECK ("status" IN ('active', 'disabled'));
ALTER TABLE "users" ADD CONSTRAINT "users_nonblank_name" CHECK (length(btrim("name")) > 0);
ALTER TABLE "auth_action_tokens" ADD CONSTRAINT "auth_action_token_purpose" CHECK ("purpose" IN ('verification', 'reset'));
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_session_lifetime" CHECK ("expiresAt" > "createdAt");
