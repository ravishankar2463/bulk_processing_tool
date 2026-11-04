-- 1. Programmable Component Instances Catalog
CREATE TABLE IF NOT EXISTS component_instance (
    instance_id VARCHAR(64) PRIMARY KEY,
    component_type VARCHAR(32) NOT NULL,
    name VARCHAR(128) NOT NULL,
    description TEXT,
    execution_mode VARCHAR(32) NOT NULL,
    language VARCHAR(32) NOT NULL DEFAULT 'JAVA',
    source_code TEXT,
    declarative_config TEXT,
    input_schema TEXT,
    output_schema TEXT,
    sample_test_payload TEXT,
    version INT NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Component Version History
CREATE TABLE IF NOT EXISTS component_instance_version (
    version_id BIGSERIAL PRIMARY KEY,
    instance_id VARCHAR(64) NOT NULL REFERENCES component_instance(instance_id) ON DELETE CASCADE,
    version INT NOT NULL,
    source_code TEXT,
    declarative_config TEXT,
    changelog TEXT,
    created_by VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_comp_ver ON component_instance_version(instance_id, version);

-- 3. Dynamic File Route Configuration
CREATE TABLE IF NOT EXISTS route_config (
    route_id VARCHAR(64) PRIMARY KEY,
    route_name VARCHAR(128) NOT NULL,
    route_type VARCHAR(32) NOT NULL,
    endpoint_uri VARCHAR(512) NOT NULL,
    processed_uri VARCHAR(512),
    error_uri VARCHAR(512),
    cron_expression VARCHAR(64),
    polling_interval_ms INT DEFAULT 5000,
    credentials_encrypted TEXT,
    parameters TEXT,
    process_id VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    version INT NOT NULL DEFAULT 1,
    created_by VARCHAR(64),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Process Pipeline Definition
CREATE TABLE IF NOT EXISTS process_definition (
    process_id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    description TEXT,
    input_format VARCHAR(32) NOT NULL DEFAULT 'CSV',
    splitter_instance_id VARCHAR(64) REFERENCES component_instance(instance_id),
    report_writer_instance_id VARCHAR(64) REFERENCES component_instance(instance_id),
    concurrency_config TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Configurable Process Steps
CREATE TABLE IF NOT EXISTS process_step_config (
    step_id VARCHAR(64) PRIMARY KEY,
    process_id VARCHAR(64) REFERENCES process_definition(process_id) ON DELETE CASCADE,
    component_instance_id VARCHAR(64) REFERENCES component_instance(instance_id),
    step_name VARCHAR(128) NOT NULL,
    step_type VARCHAR(64) NOT NULL,
    step_order INT NOT NULL,
    config_override TEXT,
    retry_limit INT DEFAULT 3,
    fail_strategy VARCHAR(32) DEFAULT 'CONTINUE_ON_ERROR',
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Lifecycle Hooks Configuration
CREATE TABLE IF NOT EXISTS lifecycle_hook_config (
    hook_id VARCHAR(64) PRIMARY KEY,
    process_id VARCHAR(64) REFERENCES process_definition(process_id) ON DELETE CASCADE,
    event_type VARCHAR(32) NOT NULL,
    action_type VARCHAR(32) NOT NULL,
    action_config TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Configuration Audit Trail
CREATE TABLE IF NOT EXISTS config_audit_log (
    audit_id BIGSERIAL PRIMARY KEY,
    entity_type VARCHAR(64) NOT NULL,
    entity_id VARCHAR(64) NOT NULL,
    action VARCHAR(32) NOT NULL,
    changed_by VARCHAR(64) NOT NULL,
    diff_payload TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Job Execution Master Table
CREATE TABLE IF NOT EXISTS bulk_job (
    job_id VARCHAR(64) PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,
    source_uri TEXT NOT NULL,
    process_id VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL,
    total_records BIGINT DEFAULT 0,
    processed_records BIGINT DEFAULT 0,
    successful_records BIGINT DEFAULT 0,
    failed_records BIGINT DEFAULT 0,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Batch Level Tracking
CREATE TABLE IF NOT EXISTS bulk_job_batch (
    batch_id VARCHAR(64) PRIMARY KEY,
    job_id VARCHAR(64) REFERENCES bulk_job(job_id) ON DELETE CASCADE,
    batch_index INT NOT NULL,
    record_count INT NOT NULL,
    status VARCHAR(32) NOT NULL,
    error_summary TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Record Error and Dead Letter Log
CREATE TABLE IF NOT EXISTS bulk_record_error (
    error_id BIGSERIAL PRIMARY KEY,
    job_id VARCHAR(64) NOT NULL,
    batch_id VARCHAR(64),
    sequence_number BIGINT,
    raw_payload TEXT,
    step_name VARCHAR(64),
    error_code VARCHAR(64),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_bulk_error_job ON bulk_record_error(job_id);

