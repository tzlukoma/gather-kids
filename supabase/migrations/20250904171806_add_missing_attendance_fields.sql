-- Migration: Add missing fields to attendance table to match frontend interface
-- This migration adds the fields needed for full check-in/check-out functionality

-- Add missing columns to attendance table
ALTER TABLE attendance 
ADD COLUMN IF NOT EXISTS check_out_at timestamptz,
ADD COLUMN IF NOT EXISTS checked_out_by text,
ADD COLUMN IF NOT EXISTS picked_up_by text,
ADD COLUMN IF NOT EXISTS pickup_method text,
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS first_time_flag boolean DEFAULT false;

-- Add check constraint for pickup_method to ensure valid values
ALTER TABLE attendance 
ADD CONSTRAINT IF NOT EXISTS attendance_pickup_method_check 
CHECK (pickup_method IS NULL OR pickup_method IN ('name_last4', 'PIN', 'other'));

-- Add comments for documentation
COMMENT ON COLUMN attendance.check_out_at IS 'Timestamp when child was checked out';
COMMENT ON COLUMN attendance.checked_out_by IS 'User ID who checked out the child';
COMMENT ON COLUMN attendance.picked_up_by IS 'Name of person who picked up the child';
COMMENT ON COLUMN attendance.pickup_method IS 'Method used for pickup verification: name_last4, PIN, or other';
COMMENT ON COLUMN attendance.notes IS 'Additional notes about attendance';
COMMENT ON COLUMN attendance.first_time_flag IS 'Flag indicating if this is the child first time attending';