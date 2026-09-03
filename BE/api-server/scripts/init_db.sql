-- JACS Studio PostgreSQL Schema Definition
-- Optimized for high-throughput JSONB storage, UUID primary keys, and instant GIN index searches

CREATE TABLE IF NOT EXISTS jacs_records (
    collection VARCHAR(64) NOT NULL,
    id VARCHAR(64) NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (collection, id)
);

-- Index for collection querying and time-series sorting
CREATE INDEX IF NOT EXISTS idx_jacs_records_collection 
    ON jacs_records (collection, created_at DESC);

-- GIN index for ultra-fast deep JSONB subfield queries
CREATE INDEX IF NOT EXISTS idx_jacs_records_data_gin 
    ON jacs_records USING gin (data);

-- Optional trigger function to auto-update updated_at timestamp on record modification
CREATE OR REPLACE FUNCTION update_jacs_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_jacs_records_updated_at ON jacs_records;

CREATE TRIGGER trg_jacs_records_updated_at
    BEFORE UPDATE ON jacs_records
    FOR EACH ROW
    EXECUTE FUNCTION update_jacs_records_updated_at();
