-- Schema for Scholarship Eligibility Verification & Management System

-- Drop tables if they exist
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS admin_requests;
DROP TABLE IF EXISTS student_documents;
DROP TABLE IF EXISTS application_details;
DROP TABLE IF EXISTS student_profile_details;
DROP TABLE IF EXISTS applications;
DROP TABLE IF EXISTS student_profiles;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS tax_records;
DROP TABLE IF EXISTS institution_fees;

-- Users Table
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('Student', 'Admin', 'Supervisor')),
    region VARCHAR(100),
    district VARCHAR(100),
    status VARCHAR(50) DEFAULT 'Active' CHECK (status IN ('Active', 'Suspended', 'Pending')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Student Profiles Table
CREATE TABLE student_profiles (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    student_name VARCHAR(255) NOT NULL,
    student_id VARCHAR(100) UNIQUE NOT NULL,
    college_name VARCHAR(255) NOT NULL,
    grade VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    region VARCHAR(100) NOT NULL
);

-- Extended Student Profile Details
CREATE TABLE student_profile_details (
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

-- Applications Table
CREATE TABLE applications (
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
    status VARCHAR(50) DEFAULT 'In Progress' CHECK (status IN ('Approved', 'Rejected', 'Hold', 'In Progress')),
    auto_eligibility_status VARCHAR(50) NOT NULL CHECK (auto_eligibility_status IN ('Eligible', 'Rejected')),
    auto_eligibility_reason TEXT,
    rejection_reason TEXT,
    hold_reason TEXT,
    override_reason TEXT,
    override_comments TEXT,
    assigned_admin VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rich Application Form Details
CREATE TABLE application_details (
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

-- Student Uploaded Documents
CREATE TABLE student_documents (
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

-- Tax Records (Mock Government DB)
CREATE TABLE tax_records (
    id VARCHAR(36) PRIMARY KEY,
    aadhaar_number VARCHAR(12) UNIQUE NOT NULL,
    annual_income DECIMAL(12, 2) NOT NULL,
    tax_paid BOOLEAN NOT NULL DEFAULT FALSE
);

-- Institution Fees (Mock Institution DB)
CREATE TABLE institution_fees (
    id VARCHAR(36) PRIMARY KEY,
    school_name VARCHAR(255) NOT NULL,
    grade VARCHAR(100) NOT NULL,
    total_fee DECIMAL(12, 2) NOT NULL,
    fee_paid DECIMAL(12, 2) NOT NULL,
    payment_status VARCHAR(50) NOT NULL,
    UNIQUE(school_name, grade)
);

-- Admin Requests (Access Requests)
CREATE TABLE admin_requests (
    id VARCHAR(36) PRIMARY KEY,
    employee_name VARCHAR(255) NOT NULL,
    employee_id VARCHAR(100) NOT NULL,
    designation VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    region VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected'))
);

-- Notifications
CREATE TABLE notifications (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    read_status BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs
CREATE TABLE audit_logs (
    id VARCHAR(36) PRIMARY KEY,
    actor_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    actor_role VARCHAR(50) NOT NULL,
    action VARCHAR(255) NOT NULL,
    application_id VARCHAR(36) REFERENCES applications(id) ON DELETE SET NULL,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
