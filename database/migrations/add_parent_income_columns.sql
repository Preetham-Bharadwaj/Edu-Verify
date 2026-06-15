-- Run on existing Supabase / PostgreSQL databases to add parent income fields.

ALTER TABLE applications
    ADD COLUMN IF NOT EXISTS father_occupation VARCHAR(100),
    ADD COLUMN IF NOT EXISTS father_annual_income DECIMAL(12, 2),
    ADD COLUMN IF NOT EXISTS mother_occupation VARCHAR(100),
    ADD COLUMN IF NOT EXISTS mother_annual_income DECIMAL(12, 2);

ALTER TABLE application_details
    ADD COLUMN IF NOT EXISTS father_occupation VARCHAR(100),
    ADD COLUMN IF NOT EXISTS father_annual_income DECIMAL(12, 2),
    ADD COLUMN IF NOT EXISTS mother_occupation VARCHAR(100),
    ADD COLUMN IF NOT EXISTS mother_annual_income DECIMAL(12, 2);

ALTER TABLE student_profile_details
    ADD COLUMN IF NOT EXISTS father_occupation VARCHAR(100),
    ADD COLUMN IF NOT EXISTS father_annual_income DECIMAL(12, 2),
    ADD COLUMN IF NOT EXISTS mother_occupation VARCHAR(100),
    ADD COLUMN IF NOT EXISTS mother_annual_income DECIMAL(12, 2);
