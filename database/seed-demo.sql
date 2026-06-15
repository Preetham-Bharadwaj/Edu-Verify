-- ================================================================
-- DEMO SEED DATA FOR SCHOLARSHIP PORTAL
-- Run this entire script in Supabase SQL Editor:
--   Supabase Dashboard -> SQL Editor -> New query -> Paste & Run
-- ================================================================

-- Create tables if they don't exist yet
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    region VARCHAR(100),
    district VARCHAR(100),
    status VARCHAR(50) DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS student_profiles (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    student_name VARCHAR(255) NOT NULL,
    student_id VARCHAR(100) UNIQUE NOT NULL,
    college_name VARCHAR(255) NOT NULL,
    grade VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    region VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS student_profile_details (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    phone VARCHAR(20),
    date_of_birth DATE,
    gender VARCHAR(20),
    address TEXT,
    academic_year VARCHAR(50),
    course_grade VARCHAR(100),
    father_name VARCHAR(255),
    mother_name VARCHAR(255),
    father_aadhaar VARCHAR(12),
    mother_aadhaar VARCHAR(12),
    student_photo_name VARCHAR(255),
    student_photo_mime_type VARCHAR(100),
    student_photo_data_base64 TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS applications (
    id VARCHAR(36) PRIMARY KEY,
    application_number VARCHAR(100) UNIQUE NOT NULL,
    student_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    father_name VARCHAR(255) NOT NULL,
    mother_name VARCHAR(255) NOT NULL,
    father_aadhaar VARCHAR(12) NOT NULL,
    mother_aadhaar VARCHAR(12) NOT NULL,
    father_occupation VARCHAR(100),
    father_annual_income DECIMAL(12, 2),
    mother_occupation VARCHAR(100),
    mother_annual_income DECIMAL(12, 2),
    status VARCHAR(50) DEFAULT 'In Progress',
    auto_eligibility_status VARCHAR(50) NOT NULL,
    auto_eligibility_reason TEXT,
    rejection_reason TEXT,
    hold_reason TEXT,
    override_reason TEXT,
    override_comments TEXT,
    assigned_admin VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS application_details (
    id VARCHAR(36) PRIMARY KEY,
    application_id VARCHAR(36) NOT NULL UNIQUE REFERENCES applications(id) ON DELETE CASCADE,
    student_name VARCHAR(255),
    student_identifier VARCHAR(100),
    school_name VARCHAR(255),
    class_grade VARCHAR(100),
    region VARCHAR(100),
    district VARCHAR(100),
    father_name VARCHAR(255),
    mother_name VARCHAR(255),
    father_aadhaar VARCHAR(12),
    mother_aadhaar VARCHAR(12),
    father_occupation VARCHAR(100),
    father_annual_income DECIMAL(12, 2),
    mother_occupation VARCHAR(100),
    mother_annual_income DECIMAL(12, 2),
    current_class VARCHAR(100),
    previous_year_percentage DECIMAL(5, 2),
    institution_name VARCHAR(255),
    academic_year VARCHAR(50),
    admin_remarks TEXT,
    required_action TEXT,
    verification_result VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS student_documents (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    application_id VARCHAR(36) REFERENCES applications(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100),
    file_size INTEGER DEFAULT 0,
    file_data_base64 TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tax_records (
    id VARCHAR(36) PRIMARY KEY,
    aadhaar_number VARCHAR(12) UNIQUE NOT NULL,
    annual_income DECIMAL(12, 2) NOT NULL,
    tax_paid BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS institution_fees (
    id VARCHAR(36) PRIMARY KEY,
    school_name VARCHAR(255) NOT NULL,
    grade VARCHAR(100) NOT NULL,
    total_fee DECIMAL(12, 2) NOT NULL,
    fee_paid DECIMAL(12, 2) NOT NULL,
    payment_status VARCHAR(50) NOT NULL,
    UNIQUE(school_name, grade)
);

CREATE TABLE IF NOT EXISTS admin_requests (
    id VARCHAR(36) PRIMARY KEY,
    employee_name VARCHAR(255) NOT NULL,
    employee_id VARCHAR(100) NOT NULL,
    designation VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    region VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending'
);

CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    read_status BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(36) PRIMARY KEY,
    actor_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    actor_role VARCHAR(50) NOT NULL,
    action VARCHAR(255) NOT NULL,
    application_id VARCHAR(36) REFERENCES applications(id) ON DELETE SET NULL,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scraped_fees (
    id VARCHAR(36) PRIMARY KEY,
    institution_name VARCHAR(255) NOT NULL,
    institution_type VARCHAR(100) NOT NULL,
    course_grade VARCHAR(100) NOT NULL,
    annual_fee DECIMAL(12, 2) NOT NULL,
    source_url TEXT NOT NULL,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(institution_name, course_grade)
);

-- ================================================================
-- DEMO ACCOUNTS
-- ================================================================

-- 1. SUPERVISOR
-- Email: supervisor@scholarship.gov.in | Password: Supervisor@123
INSERT INTO users (id, name, email, password_hash, role, status)
VALUES (
    gen_random_uuid()::VARCHAR,
    'System Supervisor',
    'supervisor@scholarship.gov.in',
    '$2a$10$7sKLlIA9Fk9d4Op7vsRXtu9yeihf6gaCz/yqOk5N.TUqmwZlTSEZy',
    'Supervisor',
    'Active'
)
ON CONFLICT (email) DO NOTHING;

-- 2. ADMIN
-- Email: admin@scholarship.gov.in | Password: Admin@123
INSERT INTO users (id, name, email, password_hash, role, region, district, status)
VALUES (
    gen_random_uuid()::VARCHAR,
    'Demo Admin Officer',
    'admin@scholarship.gov.in',
    '$2a$10$VkvQlp0wzcpl6VkYwnJl9emhIQXjZUWBOrSTvhtkH6oD8osv.eRTm',
    'Admin',
    'South',
    'Chennai',
    'Active'
)
ON CONFLICT (email) DO NOTHING;

-- 3. STUDENT + PROFILE
-- Email: student@scholarship.gov.in | Password: Student@123
DO $$
DECLARE
    student_user_id VARCHAR(36) := gen_random_uuid()::VARCHAR;
BEGIN
    INSERT INTO users (id, name, email, password_hash, role, region, district, status)
    VALUES (
        student_user_id,
        'Demo Student',
        'student@scholarship.gov.in',
        '$2a$10$hXZIlXwMLkDwnA14qiwnl.R4D3MkKgRBKPobENxQHYrXSeyrRS.J.',
        'Student',
        'South',
        'Chennai',
        'Active'
    )
    ON CONFLICT (email) DO NOTHING;

    -- Only insert profile if user was actually inserted
    IF FOUND THEN
        INSERT INTO student_profiles (id, user_id, student_name, student_id, college_name, grade, district, region)
        VALUES (
            gen_random_uuid()::VARCHAR,
            student_user_id,
            'Demo Student',
            'STU-2026-0001',
            'National Institute of Technology',
            'Year 1',
            'Chennai',
            'South'
        );

        INSERT INTO student_profile_details (
            id, user_id, phone, date_of_birth, gender, address, academic_year, course_grade,
            father_name, mother_name, father_aadhaar, mother_aadhaar
        )
        VALUES (
            gen_random_uuid()::VARCHAR,
            student_user_id,
            '+91 9876543210',
            '2005-04-10',
            'Male',
            '42 College Road, Chennai',
            '2026-2027',
            'Year 1',
            'Raman Kumar',
            'Lakshmi Raman',
            '456712341234',
            '567823455678'
        );

        INSERT INTO notifications (id, user_id, title, message)
        VALUES (
            gen_random_uuid()::VARCHAR,
            student_user_id,
            'Welcome to Scholarship Portal',
            'Hello Demo Student, your account has been set up. You can now apply for scholarships.'
        );
    END IF;
END $$;

-- ================================================================
-- VERIFY INSERTED ACCOUNTS
-- ================================================================
SELECT id, name, email, role, region, district, status, created_at
FROM users
ORDER BY created_at;
