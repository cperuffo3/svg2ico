-- Switch unique-user identifier on conversion_metrics from request-IP hash to
-- a cookie-issued anonymous client ID hash. Existing rows had IP hashes that
-- mostly resolved to upstream proxy/edge IPs (proxy was not trusted), so the
-- ip_hash data is unreliable for unique-user accounting. We drop the column
-- and add client_id_hash, leaving it NULL for historical rows so the unique-
-- user count starts fresh from deployment while volume/perf/format stats stay
-- intact. The rate_limits table is unaffected (still IP-keyed) and is fixed
-- separately by enabling trust proxy in main.ts.

-- DropIndex
DROP INDEX "conversion_metrics_ip_hash_idx";

-- AlterTable
ALTER TABLE "conversion_metrics" DROP COLUMN "ip_hash";
ALTER TABLE "conversion_metrics" ADD COLUMN "client_id_hash" TEXT;

-- CreateIndex
CREATE INDEX "conversion_metrics_client_id_hash_idx" ON "conversion_metrics"("client_id_hash");
