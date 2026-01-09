-- CreateTable
CREATE TABLE "conversion_metrics" (
    "id" TEXT NOT NULL,
    "ip_hash" TEXT NOT NULL,
    "input_format" TEXT NOT NULL,
    "output_format" TEXT NOT NULL,
    "input_size_bytes" INTEGER NOT NULL,
    "output_size_bytes" INTEGER,
    "processing_time_ms" INTEGER,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversion_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limits" (
    "id" TEXT NOT NULL,
    "ip_hash" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "window_start" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "conversion_metrics_ip_hash_idx" ON "conversion_metrics"("ip_hash");

-- CreateIndex
CREATE INDEX "conversion_metrics_created_at_idx" ON "conversion_metrics"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "rate_limits_ip_hash_key" ON "rate_limits"("ip_hash");

-- CreateIndex
CREATE INDEX "rate_limits_expires_at_idx" ON "rate_limits"("expires_at");
