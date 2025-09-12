-- Seed script for lower environments after clean schema
-- This script populates the clean schema with test data

BEGIN;

-- Insert test households
INSERT INTO households (household_id, name, address_line1, city, state, zip, preferred_scripture_translation, primary_email, primary_phone) VALUES
('test-household-1', 'Test Household 1', '123 Test St', 'Test City', 'TS', '12345', 'NIV', 'test1@example.com', '555-0001'),
('test-household-2', 'Test Household 2', '456 Test Ave', 'Test City', 'TS', '12346', 'ESV', 'test2@example.com', '555-0002');

-- Insert test guardians
INSERT INTO guardians (guardian_id, household_id, first_name, last_name, mobile_phone, email, relationship, is_primary) VALUES
('test-guardian-1', 'test-household-1', 'John', 'Doe', '555-0001', 'test1@example.com', 'Parent', true),
('test-guardian-2', 'test-household-1', 'Jane', 'Doe', '555-0002', 'jane@example.com', 'Parent', false),
('test-guardian-3', 'test-household-2', 'Bob', 'Smith', '555-0003', 'test2@example.com', 'Parent', true);

-- Insert test children
INSERT INTO children (child_id, household_id, first_name, last_name, dob, grade, child_mobile, allergies, special_needs, is_active) VALUES
('test-child-1', 'test-household-1', 'Alice', 'Doe', '2010-05-15', '8th', '555-1001', 'None', false, true),
('test-child-2', 'test-household-1', 'Charlie', 'Doe', '2012-08-22', '6th', '555-1002', 'Peanuts', false, true),
('test-child-3', 'test-household-2', 'Diana', 'Smith', '2015-03-10', '3rd', '555-1003', 'None', true, true);

-- Insert test emergency contacts
INSERT INTO emergency_contacts (contact_id, household_id, first_name, last_name, mobile_phone, relationship) VALUES
('test-contact-1', 'test-household-1', 'Emergency', 'Contact', '555-9001', 'Grandparent'),
('test-contact-2', 'test-household-2', 'Emergency', 'Contact', '555-9002', 'Aunt');

COMMIT;
