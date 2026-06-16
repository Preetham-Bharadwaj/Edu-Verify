-- Fix student_profile_details table structure and add missing data
-- Run this in your Supabase SQL Editor

-- First, check if table exists and create if missing
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
    student_photo_name VARCHAR(255),
    student_photo_mime_type VARCHAR(100),
    student_photo_data_base64 TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add missing columns if they don't exist (safe to run multiple times)
DO $$ 
BEGIN
    -- Add institution_type if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'student_profile_details' 
        AND column_name = 'institution_type'
    ) THEN
        ALTER TABLE student_profile_details ADD COLUMN institution_type VARCHAR(50) DEFAULT 'School';
    END IF;
    
    -- Add parent_occupation for backward compatibility
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'student_profile_details' 
        AND column_name = 'parent_occupation'
    ) THEN
        ALTER TABLE student_profile_details ADD COLUMN parent_occupation VARCHAR(100);
    END IF;
    
    -- Add declared_annual_income for backward compatibility
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'student_profile_details' 
        AND column_name = 'declared_annual_income'
    ) THEN
        ALTER TABLE student_profile_details ADD COLUMN declared_annual_income DECIMAL(12, 2);
    END IF;
END $$;

-- Now populate missing data for existing students
-- This will insert dummy data for students who don't have profile details yet
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
    sp.district || ', ' || sp.region AS address,
    CASE 
        WHEN sp.grade LIKE 'Year%' THEN '2024-25'
        WHEN sp.grade LIKE 'Grade%' THEN '2024-25'
        ELSE '2024-25'
    END AS academic_year,
    sp.grade AS course_grade,
    CASE 
        WHEN sp.grade LIKE 'Year%' THEN 'College'
        ELSE 'School'
    END AS institution_type,
    'Father of ' || sp.student_name AS father_name,
    'Mother of ' || sp.student_name AS mother_name,
    LPAD(FLOOR(RANDOM() * 1000000000000)::TEXT, 12, '0') AS father_aadhaar,
    LPAD(FLOOR(RANDOM() * 1000000000000)::TEXT, 12, '0') AS mother_aadhaar,
    (ARRAY['Farmer', 'Teacher', 'Daily Wage Worker', 'Small Business', 'Driver', 'Homemaker'])[FLOOR(RANDOM() * 6 + 1)] AS father_occupation,
    FLOOR(RANDOM() * 180000 + 20000) AS father_annual_income,
    (ARRAY['Homemaker', 'Teacher', 'Nurse', 'Daily Wage Worker', 'Small Business', 'Farmer'])[FLOOR(RANDOM() * 6 + 1)] AS mother_occupation,
    FLOOR(RANDOM() * 150000 + 10000) AS mother_annual_income
FROM users u
INNER JOIN student_profiles sp ON sp.user_id = u.id
WHERE u.role = 'Student'
AND NOT EXISTS (
    SELECT 1 FROM student_profile_details spd 
    WHERE spd.user_id = u.id
)
ON CONFLICT (user_id) DO NOTHING;

-- Verify the results
SELECT 
    COUNT(*) as total_students,
    COUNT(spd.id) as students_with_details,
    COUNT(*) - COUNT(spd.id) as students_missing_details
FROM users u
INNER JOIN student_profiles sp ON sp.user_id = u.id
LEFT JOIN student_profile_details spd ON spd.user_id = u.id
WHERE u.role = 'Student';
