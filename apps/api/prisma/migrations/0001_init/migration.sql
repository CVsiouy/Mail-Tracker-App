-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "google_sub" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "photo_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gmail_accounts" (
    "user_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "refresh_token_ciphertext" BYTEA,
    "refresh_token_nonce" BYTEA,
    "refresh_token_tag" BYTEA,
    "history_id" TEXT,
    "last_synced_at" TIMESTAMP(3),
    "sync_status" TEXT NOT NULL DEFAULT 'idle',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gmail_accounts_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "refresh_token_hash" BYTEA NOT NULL,
    "device_id" TEXT,
    "revoked_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emails" (
    "user_id" UUID NOT NULL,
    "message_id" TEXT NOT NULL,
    "thread_id" TEXT,
    "from_addr" TEXT NOT NULL,
    "from_name" TEXT,
    "subject" TEXT NOT NULL DEFAULT '',
    "snippet" TEXT NOT NULL DEFAULT '',
    "received_at" TIMESTAMP(3) NOT NULL,
    "is_unread" BOOLEAN NOT NULL DEFAULT true,
    "has_attachment" BOOLEAN NOT NULL DEFAULT false,
    "category" TEXT NOT NULL DEFAULT 'General',
    "ai_confidence" DOUBLE PRECISION,
    "ai_reason" TEXT,
    "ai_status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emails_pkey" PRIMARY KEY ("user_id","message_id")
);

-- CreateTable
CREATE TABLE "swipes" (
    "user_id" UUID NOT NULL,
    "message_id" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "swiped_at" TIMESTAMP(3) NOT NULL,
    "device_id" TEXT,

    CONSTRAINT "swipes_pkey" PRIMARY KEY ("user_id","message_id")
);

-- CreateTable
CREATE TABLE "push_tokens" (
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("user_id","token")
);

-- CreateTable
CREATE TABLE "categorization_jobs" (
    "id" BIGSERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "message_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "run_after" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locked_at" TIMESTAMP(3),
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categorization_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_google_sub_key" ON "users"("google_sub");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_refresh_token_hash_key" ON "sessions"("refresh_token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "emails_user_id_received_at_idx" ON "emails"("user_id", "received_at" DESC);

-- CreateIndex
CREATE INDEX "emails_user_id_category_idx" ON "emails"("user_id", "category");

-- CreateIndex
CREATE INDEX "emails_user_id_ai_status_idx" ON "emails"("user_id", "ai_status");

-- CreateIndex
CREATE INDEX "swipes_user_id_swiped_at_idx" ON "swipes"("user_id", "swiped_at");

-- CreateIndex
CREATE INDEX "categorization_jobs_status_run_after_idx" ON "categorization_jobs"("status", "run_after");

-- CreateIndex
CREATE UNIQUE INDEX "categorization_jobs_user_id_message_id_key" ON "categorization_jobs"("user_id", "message_id");

-- AddForeignKey
ALTER TABLE "gmail_accounts" ADD CONSTRAINT "gmail_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emails" ADD CONSTRAINT "emails_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "swipes" ADD CONSTRAINT "swipes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categorization_jobs" ADD CONSTRAINT "categorization_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

