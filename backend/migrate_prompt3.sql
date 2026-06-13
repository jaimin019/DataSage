-- Migration for Prompt 3: Agent Layer
-- Run this in the Supabase SQL Editor

-- Insights table: add structured columns
ALTER TABLE insights ADD COLUMN IF NOT EXISTS rank INTEGER;
ALTER TABLE insights ADD COLUMN IF NOT EXISTS category VARCHAR;
ALTER TABLE insights ADD COLUMN IF NOT EXISTS supporting_columns JSONB;
ALTER TABLE insights ADD COLUMN IF NOT EXISTS confidence FLOAT;

-- Visualizations table: add chart_id and data
ALTER TABLE visualizations ADD COLUMN IF NOT EXISTS chart_id VARCHAR;
ALTER TABLE visualizations ADD COLUMN IF NOT EXISTS data JSONB;

-- Reports table: add report_url
ALTER TABLE reports ADD COLUMN IF NOT EXISTS report_url VARCHAR;
