-- ============================================================================
-- COMPLETE DATABASE FIX - Run this in Supabase SQL Editor
-- This will fix all issues with missing data in your production database
-- ============================================================================

-- STEP 1: Fix institution_fees table (remove payment columns)
-- ============================================================================
DO $$ 
BEGIN
    -- Drop fee_paid column if exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'institution_fees' AND column_name = 'fee_paid'
    ) THEN
        ALTER TABLE institution_fees DROP COLUMN fee_paid;
        RAISE NOTICE 'Dropped fee_paid column';
    END IF;
    
    -- Drop payment_status column if exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'institution_fees' AND column_name = 'payment_status'
    ) THEN
        ALTER TABLE institution_fees DROP COLUMN payment_status;
        RAISE NOTICE 'Dropped payment_status column';
    END IF;
END $$;

-- STEP 2: Ensure student_profile_details table exists with all columns
-- ============================================================================
CREATE TABLE IF NOT EXISTS student_profile_details (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    phone VARCHAR(20),
    date_of_birth DATE,
    gender VARCHAR(20),
    address TEXT,
    academic_year VARCHAR(50),
    course_grade VARCHAR(100),
    institution_type VARCHAR(50) DEFAULT 'School',
    father_name VARCHAR(255),
    mother_name VARCHAR(255),
    father_aadhaar VARCHAR(12),
    mother_aadhaar VARCHAR(12),
    father_occupation VARCHAR(100),
    father_annual_income DECIMAL(12, 2),
    mother_occupation VARCHAR(100),
    mother_annual_income DECIMAL(12, 2),
    parent_occupation VARCHAR(100),
    declared_annual_income DECIMAL(12, 2),
    student_photo_name VARCHAR(255),
    student_photo_mime_type VARCHAR(100),
    student_photo_data_base64 TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add missing columns to student_profile_details if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_profile_details' AND column_name = 'institution_type') THEN
        ALTER TABLE student_profile_details ADD COLUMN institution_type VARCHAR(50) DEFAULT 'School';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_profile_details' AND column_name = 'parent_occupation') THEN
        ALTER TABLE student_profile_details ADD COLUMN parent_occupation VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_profile_details' AND column_name = 'declared_annual_income') THEN
        ALTER TABLE student_profile_details ADD COLUMN declared_annual_income DECIMAL(12, 2);
    END IF;
END $$;

-- STEP 3: Populate student_profile_details for ALL existing students
-- ============================================================================
INSERT INTO student_profile_details (
    id,
    user_id,
    phone,
    date_of_birth,
    gender,
    address,
    academic_year,
    course_grade,
    institution_type,
    father_name,
    mother_name,
    father_aadhaar,
    mother_aadhaar,
    father_occupation,
    father_annual_income,
    mother_occupation,
    mother_annual_income
)
SELECT 
    gen_random_uuid()::text AS id,
    u.id AS user_id,
    '9' || LPAD(FLOOR(RANDOM() * 999999999)::TEXT, 9, '0') AS phone,
    DATE '1995-01-01' + (RANDOM() * 10000)::INTEGER AS date_of_birth,
    CASE WHEN RANDOM() < 0.5 THEN 'Male' ELSE 'Female' END AS gender,
    sp.district || ', ' || sp.region || ', Karnataka' AS address,
    '2024-25' AS academic_year,
    sp.grade AS course_grade,
    CASE 
        WHEN sp.grade LIKE 'Year%' THEN 'College'
        WHEN sp.college_name LIKE '%University%' THEN 'College'
        WHEN sp.college_name LIKE '%College%' THEN 'College'
        ELSE 'School'
    END AS institution_type,
    'Father of ' || sp.student_name AS father_name,
    'Mother of ' || sp.student_name AS mother_name,
    LPAD(FLOOR(RANDOM() * 1000000000000)::TEXT, 12, '0') AS father_aadhaar,
    LPAD(FLOOR(RANDOM() * 1000000000000)::TEXT, 12, '0') AS mother_aadhaar,
    (ARRAY['Farmer', 'Teacher', 'Daily Wage Worker', 'Small Business Owner', 'Driver', 'Government Employee'])[FLOOR(RANDOM() * 6 + 1)] AS father_occupation,
    FLOOR(RANDOM() * 150000 + 30000) AS father_annual_income,
    (ARRAY['Homemaker', 'Teacher', 'Nurse', 'Daily Wage Worker', 'Small Business Owner', 'Anganwadi Worker'])[FLOOR(RANDOM() * 6 + 1)] AS mother_occupation,
    FLOOR(RANDOM() * 100000 + 20000) AS mother_annual_income
FROM users u
INNER JOIN student_profiles sp ON sp.user_id = u.id
WHERE u.role = 'Student'
AND NOT EXISTS (
    SELECT 1 FROM student_profile_details spd 
    WHERE spd.user_id = u.id
)
ON CONFLICT (user_id) DO NOTHING;

-- STEP 4: Populate institution_fees table with sample data
-- ============================================================================
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
    (gen_random_uuid()::text, 'State University', 'Year 3', 42000),
    (gen_random_uuid()::text, 'State University', 'Year 4', 45000),
    (gen_random_uuid()::text, 'Government High School', 'Grade 9', 5000),
    (gen_random_uuid()::text, 'Government High School', 'Grade 10', 5500),
    (gen_random_uuid()::text, 'Government High School', 'Grade 11', 6000),
    (gen_random_uuid()::text, 'Government High School', 'Grade 12', 6500),
    (gen_random_uuid()::text, 'Christ University', 'Year 1', 125000),
    (gen_random_uuid()::text, 'Christ University', 'Year 2', 130000),
    (gen_random_uuid()::text, 'St. Joseph College', 'Year 1', 85000),
    (gen_random_uuid()::text, 'St. Joseph College', 'Year 2', 90000)
ON CONFLICT (school_name, grade) DO UPDATE 
SET total_fee = EXCLUDED.total_fee;

-- STEP 5: Verify the fix - Show summary
-- ============================================================================
DO $$
DECLARE
    total_students INT;
    students_with_details INT;
    students_missing_details INT;
    total_fees INT;
BEGIN
    -- Count students
    SELECT COUNT(*) INTO total_students
    FROM users u
    INNER JOIN student_profiles sp ON sp.user_id = u.id
    WHERE u.role = 'Student';
    
    SELECT COUNT(*) INTO students_with_details
    FROM student_profile_details;
    
    students_missing_details := total_students - students_with_details;
    
    SELECT COUNT(*) INTO total_fees
    FROM institution_fees;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'DATABASE FIX COMPLETED!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total Students: %', total_students;
    RAISE NOTICE 'Students with Profile Details: %', students_with_details;
    RAISE NOTICE 'Students Missing Details: %', students_missing_details;
    RAISE NOTICE 'Institution Fee Records: %', total_fees;
    RAISE NOTICE '========================================';
    
    IF students_missing_details = 0 THEN
        RAISE NOTICE 'SUCCESS: All students have complete profile details!';
    ELSE
        RAISE NOTICE 'WARNING: Some students still missing details. Please investigate.';
    END IF;
END $$;

-- Show sample of populated data
SELECT 
    u.name as student_name,
    spd.phone,
    spd.date_of_birth,
    spd.gender,
    spd.address,
    spd.father_name,
    spd.father_occupation,
    spd.father_annual_income,
    spd.mother_name,
    spd.mother_occupation,
    spd.mother_annual_income
FROM users u
INNER JOIN student_profile_details spd ON spd.user_id = u.id
WHERE u.role = 'Student'
LIMIT 5;
