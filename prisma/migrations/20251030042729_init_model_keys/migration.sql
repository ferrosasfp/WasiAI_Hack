-- CreateTable
CREATE TABLE "ModelKey" (
    "id" SERIAL NOT NULL,
    "modelId" INTEGER NOT NULL,
    "slug" VARCHAR(120),
    "keyB64" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModelKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ModelKey_modelId_key" ON "ModelKey"("modelId");

-- CreateIndex
CREATE INDEX "ModelKey_slug_idx" ON "ModelKey"("slug");
