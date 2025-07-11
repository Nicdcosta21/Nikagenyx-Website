-- Reports Schema

-- Custom Reports table
CREATE TABLE custom_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    config JSONB NOT NULL,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(255),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Scheduled Reports table
CREATE TABLE scheduled_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES custom_reports(id) ON DELETE CASCADE,
    report_name VARCHAR(255) NOT NULL,
    report_type VARCHAR(50) NOT NULL,
    active BOOLEAN DEFAULT true,
    format VARCHAR(10) NOT NULL,
    recipients TEXT[] NOT NULL,
    schedule JSONB NOT NULL,
    email_subject VARCHAR(255) NOT NULL,
    email_body TEXT,
    last_run_at TIMESTAMP WITH TIME ZONE,
    next_run_at TIMESTAMP WITH TIME ZONE,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(255),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Report Runs table (to track report execution history)
CREATE TABLE report_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL,
    report_type VARCHAR(50) NOT NULL,
    format VARCHAR(10) NOT NULL,
    status VARCHAR(20) NOT NULL,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_by VARCHAR(255) NOT NULL
);

-- Report Exports table (to track exported files)
CREATE TABLE report_exports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL,
    report_type VARCHAR(50) NOT NULL,
    format VARCHAR(10) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_custom_reports_created_by ON custom_reports(created_by);
CREATE INDEX idx_scheduled_reports_report_id ON scheduled_reports(report_id);
CREATE INDEX idx_scheduled_reports_active ON scheduled_reports(active);
CREATE INDEX idx_scheduled_reports_next_run_at ON scheduled_reports(next_run_at);
CREATE INDEX idx_report_runs_report_id ON report_runs(report_id);
CREATE INDEX idx_report_runs_status ON report_runs(status);
CREATE INDEX idx_report_exports_report_id ON report_exports(report_id);
