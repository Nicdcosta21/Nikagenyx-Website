-- Filter Templates Schema

CREATE TABLE filter_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    filter JSONB NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE,
    is_public BOOLEAN DEFAULT false
);

-- Indexes
CREATE INDEX idx_filter_templates_created_by ON filter_templates(created_by);
CREATE INDEX idx_filter_templates_entity_type ON filter_templates(entity_type);
CREATE INDEX idx_filter_templates_is_public ON filter_templates(is_public);
