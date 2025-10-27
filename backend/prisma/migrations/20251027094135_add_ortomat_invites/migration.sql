-- CreateTable
CREATE TABLE "ortomat_invites" (
    "id" TEXT NOT NULL,
    "ortomatId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "usedBy" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ortomat_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ortomat_invites_token_key" ON "ortomat_invites"("token");

-- AddForeignKey
ALTER TABLE "ortomat_invites" ADD CONSTRAINT "ortomat_invites_ortomatId_fkey" FOREIGN KEY ("ortomatId") REFERENCES "ortomats"("id") ON DELETE CASCADE ON UPDATE CASCADE;
