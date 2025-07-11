-- Schema for saved reports

-- Create enum for report types
CREATE TYPE report_type AS ENUM (
    'balance_sheet',
    'profit_loss',
    'cash_flow',
    'custom',
    'mis'
);

-- Create enum for report formats
CREATE TYPE report_format AS ENUM (
    'pdf',
    'excel',
    'csv'
);

-- Create table for saved report configurations
CREATE TABLE saved_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type report_type NOT NULL,
    config JSONB NOT NULL,
    is_template BOOLEAN DEFAULT false,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(255),
    updated_at TIMESTAMP WITH TIME ZONE,
    last_run_at TIMESTAMP WITH TIME ZONE,
    favorite BOOLEAN DEFAULT false
);

-- Create table for report results
CREATE TABLE report_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID REFERENCES saved_reports(id) ON DELETE CASCADE,
    parameters JSONB NOT NULL,
    results JSONB NOT NULL,
    format report_format NOT NULL,
    file_path VARCHAR(255),
    file_size INTEGER,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX idx_saved_reports_created_by ON saved_reports(created_by);
CREATE INDEX idx_saved_reports_type ON saved_reports(type);
CREATE INDEX idx_saved_reports_favorite ON saved_reports(favorite);
CREATE INDEX idx_report_results_report_id ON report_results(report_id);
