-- Rename tables in place (keeps data); Prisma generated DROP/CREATE, replaced by hand.
ALTER TABLE "user" RENAME TO "users";
ALTER TABLE "session" RENAME TO "sessions";
ALTER TABLE "account" RENAME TO "accounts";
ALTER TABLE "verification" RENAME TO "verifications";

-- Primary keys (also renames their backing indexes)
ALTER TABLE "users" RENAME CONSTRAINT "user_pkey" TO "users_pkey";
ALTER TABLE "sessions" RENAME CONSTRAINT "session_pkey" TO "sessions_pkey";
ALTER TABLE "accounts" RENAME CONSTRAINT "account_pkey" TO "accounts_pkey";
ALTER TABLE "verifications" RENAME CONSTRAINT "verification_pkey" TO "verifications_pkey";

-- Foreign keys
ALTER TABLE "sessions" RENAME CONSTRAINT "session_userId_fkey" TO "sessions_userId_fkey";
ALTER TABLE "accounts" RENAME CONSTRAINT "account_userId_fkey" TO "accounts_userId_fkey";

-- Indexes
ALTER INDEX "user_email_key" RENAME TO "users_email_key";
ALTER INDEX "session_userId_idx" RENAME TO "sessions_userId_idx";
ALTER INDEX "session_token_key" RENAME TO "sessions_token_key";
ALTER INDEX "account_userId_idx" RENAME TO "accounts_userId_idx";
ALTER INDEX "verification_identifier_idx" RENAME TO "verifications_identifier_idx";
