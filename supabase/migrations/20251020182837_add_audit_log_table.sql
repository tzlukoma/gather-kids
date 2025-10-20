-- Create audit log table for tracking household data changes
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id TEXT REFERENCES households(household_id),
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL, -- 'guardian', 'child', 'household', 'enrollment', 'emergency_contact'
  entity_id TEXT,
  changes JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_audit_log_household ON audit_log(household_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);

-- Add comment for documentation
COMMENT ON TABLE audit_log IS 'Audit trail for household, guardian, child, and enrollment data changes';
COMMENT ON COLUMN audit_log.action IS 'Action performed: create, update, delete';
COMMENT ON COLUMN audit_log.entity_type IS 'Type of entity: guardian, child, household, enrollment, emergency_contact';
COMMENT ON COLUMN audit_log.changes IS 'JSONB object containing before/after values';

