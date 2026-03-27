-- Initialize userless database schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- PublicKeyPolicy table
CREATE TABLE IF NOT EXISTS "PublicKeyPolicy" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    revoked BOOLEAN NOT NULL DEFAULT false,
    "allowedToPost" BOOLEAN NOT NULL DEFAULT true,
    "canStartThreads" BOOLEAN NOT NULL DEFAULT true,
    "isMaster" BOOLEAN NOT NULL DEFAULT false,
    "allowedToUploadFiles" BOOLEAN NOT NULL DEFAULT true,
    "maxFileSize" BIGINT NOT NULL DEFAULT 1000000
);

-- PublicKey table
CREATE TABLE IF NOT EXISTS "PublicKey" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "armoredKey" TEXT NOT NULL UNIQUE,
    comment TEXT NOT NULL,
    email TEXT NOT NULL,
    finger TEXT NOT NULL UNIQUE,
    "keyId" TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    "policyId" UUID UNIQUE,
    CONSTRAINT fk_policy FOREIGN KEY ("policyId") REFERENCES "PublicKeyPolicy"(id) ON DELETE SET NULL
);

-- Create indexes for PublicKey
CREATE INDEX IF NOT EXISTS "PublicKey_email_idx" ON "PublicKey"(email);
CREATE INDEX IF NOT EXISTS "PublicKey_name_idx" ON "PublicKey"(name);
CREATE INDEX IF NOT EXISTS "PublicKey_keyId_idx" ON "PublicKey"("keyId");

-- Thread table
CREATE TABLE IF NOT EXISTS "Thread" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    body TEXT NOT NULL,
    hash TEXT NOT NULL UNIQUE,
    "replyTo" TEXT,
    "signedById" UUID NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    info JSONB,
    CONSTRAINT fk_signed_by FOREIGN KEY ("signedById") REFERENCES "PublicKey"(id) ON DELETE NO ACTION,
    CONSTRAINT fk_parent FOREIGN KEY ("replyTo") REFERENCES "Thread"(hash) ON DELETE NO ACTION
);

-- Create indexes for Thread
CREATE INDEX IF NOT EXISTS "Thread_replyTo_idx" ON "Thread"("replyTo");
CREATE INDEX IF NOT EXISTS "Thread_signedById_idx" ON "Thread"("signedById");

-- ThreadRef table
CREATE TABLE IF NOT EXISTS "ThreadRef" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    "threadHash" TEXT NOT NULL,
    advertise BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT fk_thread FOREIGN KEY ("threadHash") REFERENCES "Thread"(hash) ON DELETE CASCADE
);

-- ThreadPolicy table
CREATE TABLE IF NOT EXISTS "ThreadPolicy" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visible BOOLEAN NOT NULL DEFAULT true,
    "acceptsReplies" BOOLEAN NOT NULL DEFAULT true,
    "encryptFor" TEXT[] NOT NULL DEFAULT '{}',
    "policyEditors" TEXT[] NOT NULL DEFAULT '{}',
    advertise BOOLEAN NOT NULL DEFAULT false,
    "threadHash" TEXT UNIQUE,
    CONSTRAINT fk_thread_policy FOREIGN KEY ("threadHash") REFERENCES "Thread"(hash) ON DELETE CASCADE
);

-- File table
CREATE TABLE IF NOT EXISTS "File" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "signedById" TEXT NOT NULL,
    hash TEXT NOT NULL UNIQUE,
    timestamp TIMESTAMP NOT NULL,
    size BIGINT NOT NULL,
    "mimeType" TEXT,
    CONSTRAINT fk_file_signed_by FOREIGN KEY ("signedById") REFERENCES "PublicKey"(finger) ON DELETE NO ACTION
);
