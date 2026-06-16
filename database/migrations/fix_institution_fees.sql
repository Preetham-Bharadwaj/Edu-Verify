-- Fix institution_fees table - remove payment columns
-- Run this in your Supabase SQL Editor

-- Drop the old columns if they exist
DO $$ 
BEGIN
    -- Drop fee_paid column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'institution_fees' 
        AND column_name = 'fee_paid'
    ) THEN
        ALTER TABLE institution_fees DROP COLUMN fee_paid;
    END IF;
    
    -- Drop payment_status column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'institution_fees' 
        AND column_name = 'payment_status'
    ) THEN
        ALTER TABLE institution_fees DROP COLUMN payment_status;
    END IF;
END $$;

-- Ensure the table structure is correct
CREATE TABLE IF NOT EXISTS institution_fees (
    id VARCHAR(36) PRIMARY KEY,
    school_name VARCHAR(255) NOT NULL,
    grade VARCHAR(100) NOT NULL,
    total_fee DECIMAL(12, 2) NOT NULL,
    UNIQUE(school_name, grade)
);

-- Add some sample institution fee data if table is empty
INSERT INTO institution_fees (id, school_name, grade, total_fee) VALUES
    (gen_random_uuid()::text, 'BMS College of Engineering', 'Year 1', 65000),
    (gen_random_uuid()::text, 'BMS College of Engineering', 'Year 2', 70000),
    (gen_random_uuid()::text, 'BMS College of Engineering', 'Year 3', 75000),
    (gen_random_uuid()::text, 'BMS College of Engineering', 'Year 4', 80000),
    (gen_random_uuid()::text, 'National Public School', 'Grade 10', 45000),
    (gen_random_uuid()::text, 'National Public School', 'Grade 11', 48000),
    (gen_random_uuid()::text, 'National Public School', 'Grade 12', 50000),
    (gen_random_uuid()::text, 'State University', 'Year 1', 35000),
    (gen_random_uuid()::text, 'State University', 'Year 2', 40000),
    (gen_random_uuid()::text, 'Government High School', 'Grade 9', 5000),
    (gen_random_uuid()::text, 'Government High School', 'Grade 10', 5500),
    (gen_random_uuid()::text, 'Government High School', 'Grade 11', 6000),
    (gen_random_uuid()::text, 'Government High School', 'Grade 12', 6500)
ON CONFLICT (school_name, grade) DO UPDATE 
SET total_fee = EXCLUDED.total_fee;

-- Verify results
SELECT COUNT(*) as total_fee_records FROM institution_fees;
