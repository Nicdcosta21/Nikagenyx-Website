-- Export Templates Schema

CREATE TABLE export_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL, -- pdf, excel, csv
    template_data JSONB NOT NULL,
    branding_settings JSONB,
    is_default BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT false,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Create table for company branding profiles
CREATE TABLE branding_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    logo_url TEXT,
    company_name VARCHAR(255),
    primary_color VARCHAR(7),
    secondary_color VARCHAR(7),
    font_family VARCHAR(100),
    header_footer_settings JSONB,
    letterhead_settings JSONB,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX idx_export_templates_type ON export_templates(type);
CREATE INDEX idx_export_templates_created_by ON export_templates(created_by);
CREATE INDEX idx_export_templates_is_public ON export_templates(is_public);
CREATE INDEX idx_branding_profiles_created_by ON branding_profiles(created_by);
