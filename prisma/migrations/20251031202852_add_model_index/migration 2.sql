-- CreateTable
CREATE TABLE "ModelIndex" (
    "id" SERIAL NOT NULL,
    "chain" VARCHAR(16) NOT NULL,
    "network" VARCHAR(32) NOT NULL,
    "modelId" VARCHAR(128),
    "slug" VARCHAR(120),
    "name" VARCHAR(200),
    "uri" VARCHAR(255) NOT NULL,
    "version" INTEGER,
    "owner" VARCHAR(128),
    "txHash" VARCHAR(130),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModelIndex_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ModelIndex_chain_network_idx" ON "ModelIndex"("chain", "network");

-- CreateIndex
CREATE INDEX "ModelIndex_slug_idx" ON "ModelIndex"("slug");
