-- CreateTable InferenceResult
CREATE TABLE "InferenceResult" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "evseId" TEXT NOT NULL,
    "connectorId" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "anomalies" JSONB NOT NULL,
    "totalSamples" INTEGER NOT NULL,
    "totalAnomalies" INTEGER NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL,
    "dataPoints" INTEGER NOT NULL,
    "s3Url" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "timing" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InferenceResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InferenceResult_deviceId_key" ON "InferenceResult"("deviceId");

-- CreateIndex
CREATE INDEX "InferenceResult_evseId_idx" ON "InferenceResult"("evseId");

-- CreateIndex
CREATE INDEX "InferenceResult_updatedAt_idx" ON "InferenceResult"("updatedAt");
