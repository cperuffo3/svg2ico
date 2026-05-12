-- Adds the error_submissions table where users can opt-in to submit SVG files
-- that failed validation, so admins can review them and improve the sanitizer.

-- CreateTable
CREATE TABLE "error_submissions" (
    "id" TEXT NOT NULL,
    "client_id_hash" TEXT,
    "original_filename" TEXT NOT NULL,
    "file_size_bytes" INTEGER NOT NULL,
    "svg_content" TEXT NOT NULL,
    "error_message" TEXT NOT NULL,
    "error_type" TEXT NOT NULL,
    "classification" TEXT,
    "matched_patterns" JSONB,
    "pattern_locations" JSONB,
    "user_notes" TEXT,
    "reviewed" BOOLEAN NOT NULL DEFAULT false,
    "reviewer_notes" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "error_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "error_submissions_reviewed_idx" ON "error_submissions"("reviewed");

-- CreateIndex
CREATE INDEX "error_submissions_created_at_idx" ON "error_submissions"("created_at");
