-- Schedules Schema

-- Create enum for schedule frequencies
CREATE TYPE schedule_frequency AS ENUM (
    'daily',
    'weekly',
    'monthly',
    'quarterly'
);

-- Create enum for schedule status
CREATE TYPE schedule_status AS ENUM (
    'active',
    'paused',
    'completed',
    'error'
);

-- Create enum for run status
CREATE TYPE run_status AS ENUM (
    'pending',
    'running',
    'completed',
    'failed'
);

-- Create table for report schedules
CREATE TABLE report_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    report_id UUID NOT NULL,
    frequency schedule_frequency NOT NULL,
    schedule_time TIME NOT NULL,
    schedule_days INTEGER[] DEFAULT '{}',
    month_day INTEGER,
    recipients TEXT[] NOT NULL,
    format VARCHAR(50) NOT NULL,
    parameters JSONB DEFAULT '{}',
    status schedule_status DEFAULT 'active',
    last_run_at TIMESTAMP WITH TIME ZONE,
    next_run_at TIMESTAMP WITH TIME ZONE,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Create table for schedule runs
CREATE TABLE schedule_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_id UUID REFERENCES report_schedules(id) ON DELETE CASCADE,
    status run_status NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    output_url TEXT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create table for schedule templates
CREATE TABLE schedule_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    config JSONB NOT NULL,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX idx_report_schedules_report_id ON report_schedules(report_id);
CREATE INDEX idx_report_schedules_status ON report_schedules(status);
CREATE INDEX idx_report_schedules_next_run ON report_schedules(next_run_at);
CREATE INDEX idx_schedule_runs_schedule_id ON schedule_runs(schedule_id);
CREATE INDEX idx_schedule_runs_status ON schedule_runs(status);
CREATE INDEX idx_schedule_templates_created_by ON schedule_templates(created_by);
