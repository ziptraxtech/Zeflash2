CREATE TABLE "PartnerCoupon" (
    "code" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "remaining" INTEGER NOT NULL DEFAULT 1,
    "redeemedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerCoupon_pkey" PRIMARY KEY ("code")
);

CREATE UNIQUE INDEX "PartnerCoupon_orderId_key" ON "PartnerCoupon"("orderId");
CREATE INDEX "PartnerCoupon_clerkUserId_idx" ON "PartnerCoupon"("clerkUserId");
