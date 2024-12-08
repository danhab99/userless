-- CreateTable
CREATE TABLE "Thread" (
    "body" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "_id" TEXT NOT NULL,
    "replyTo" TEXT,
    "signedById" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "info" JSONB,

    CONSTRAINT "Thread_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "ThreadPolicy" (
    "_id" TEXT NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "acceptsReplies" BOOLEAN NOT NULL DEFAULT true,
    "encryptFor" TEXT[],
    "policyEditors" TEXT[],
    "advertise" BOOLEAN NOT NULL DEFAULT false,
    "threadHash" TEXT,

    CONSTRAINT "ThreadPolicy_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "PublicKey" (
    "armoredKey" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "finger" TEXT NOT NULL,
    "_id" TEXT NOT NULL,
    "keyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "publicKeyPolicyId" TEXT NOT NULL,

    CONSTRAINT "PublicKey_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "PublicKeyPolicy" (
    "_id" TEXT NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "allowedToPost" BOOLEAN NOT NULL DEFAULT true,
    "canStartThreads" BOOLEAN NOT NULL DEFAULT true,
    "isMaster" BOOLEAN NOT NULL DEFAULT false,
    "allowedToUploadFiles" BOOLEAN NOT NULL DEFAULT true,
    "maxFileSize" BIGINT NOT NULL DEFAULT 1000000,

    CONSTRAINT "PublicKeyPolicy_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "File" (
    "_id" TEXT NOT NULL,
    "signedById" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "size" BIGINT NOT NULL,
    "mimeType" TEXT,

    CONSTRAINT "File_pkey" PRIMARY KEY ("_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Thread_hash_key" ON "Thread"("hash");

-- CreateIndex
CREATE INDEX "Thread_replyTo_idx" ON "Thread"("replyTo");

-- CreateIndex
CREATE INDEX "Thread_signedById_idx" ON "Thread"("signedById");

-- CreateIndex
CREATE UNIQUE INDEX "ThreadPolicy_threadHash_key" ON "ThreadPolicy"("threadHash");

-- CreateIndex
CREATE UNIQUE INDEX "PublicKey_armoredKey_key" ON "PublicKey"("armoredKey");

-- CreateIndex
CREATE UNIQUE INDEX "PublicKey_finger_key" ON "PublicKey"("finger");

-- CreateIndex
CREATE UNIQUE INDEX "PublicKey_keyId_key" ON "PublicKey"("keyId");

-- CreateIndex
CREATE INDEX "PublicKey_email_idx" ON "PublicKey"("email");

-- CreateIndex
CREATE INDEX "PublicKey_name_idx" ON "PublicKey"("name");

-- CreateIndex
CREATE INDEX "PublicKey_keyId_idx" ON "PublicKey"("keyId");

-- CreateIndex
CREATE UNIQUE INDEX "File_hash_key" ON "File"("hash");

-- AddForeignKey
ALTER TABLE "Thread" ADD CONSTRAINT "Thread_replyTo_fkey" FOREIGN KEY ("replyTo") REFERENCES "Thread"("hash") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Thread" ADD CONSTRAINT "Thread_signedById_fkey" FOREIGN KEY ("signedById") REFERENCES "PublicKey"("keyId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ThreadPolicy" ADD CONSTRAINT "ThreadPolicy_threadHash_fkey" FOREIGN KEY ("threadHash") REFERENCES "Thread"("hash") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicKey" ADD CONSTRAINT "PublicKey_publicKeyPolicyId_fkey" FOREIGN KEY ("publicKeyPolicyId") REFERENCES "PublicKeyPolicy"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_signedById_fkey" FOREIGN KEY ("signedById") REFERENCES "PublicKey"("finger") ON DELETE RESTRICT ON UPDATE CASCADE;
