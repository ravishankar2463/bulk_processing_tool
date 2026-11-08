-- V3: Add route retention days for housekeeping and job telemetry columns

-- 1. Route retention for housekeeping (1 to 90 days)
ALTER TABLE route_config ADD COLUMN IF NOT EXISTS retention_days INT NOT NULL DEFAULT 30;

-- 2. Extended job telemetry & lineage fields
ALTER TABLE bulk_job ADD COLUMN IF NOT EXISTS stage VARCHAR(32) DEFAULT 'DONE';
ALTER TABLE bulk_job ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT DEFAULT 0;
ALTER TABLE bulk_job ADD COLUMN IF NOT EXISTS detected_encoding VARCHAR(32) DEFAULT 'UTF-8';
ALTER TABLE bulk_job ADD COLUMN IF NOT EXISTS detected_delimiter VARCHAR(16) DEFAULT ',';
ALTER TABLE bulk_job ADD COLUMN IF NOT EXISTS checksum_sha256 VARCHAR(128) DEFAULT 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
ALTER TABLE bulk_job ADD COLUMN IF NOT EXISTS loom_thread_allocation VARCHAR(64) DEFAULT 'VirtualThread-Worker-1';

-- 3. Extended batch telemetry fields
ALTER TABLE bulk_job_batch ADD COLUMN IF NOT EXISTS duration_micros BIGINT DEFAULT 0;
ALTER TABLE bulk_job_batch ADD COLUMN IF NOT EXISTS partition_id VARCHAR(64);
