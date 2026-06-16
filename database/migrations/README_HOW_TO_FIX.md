# How to Fix Missing Student Data in Production

## Problem
Your deployed app shows **dashes (—)** for DOB, phone, gender, address, father/mother details because the `student_profile_details` table is either:
1. Missing from your Supabase database, OR
2. Exists but has no data for existing students

## Solution - Run SQL Script in Supabase

### Step 1: Open Supabase SQL Editor
1. Go to: https://supabase.com/dashboard
2. Select your project
3. Click **"SQL Editor"** in the left sidebar
4. Click **"New Query"**

### Step 2: Copy and Run the Fix Script
1. Open the file: `database/migrations/COMPLETE_FIX_ALL_ISSUES.sql`
2. Copy ALL the content
3. Paste it into the Supabase SQL Editor
4. Click **"Run"** button (or press Ctrl+Enter)

### Step 3: Wait for Completion
The script will:
- ✅ Remove `fee_paid` and `payment_status` columns from `institution_fees`
- ✅ Create `student_profile_details` table if missing
- ✅ Add all required columns
- ✅ Generate dummy data for ALL existing students (DOB, phone, gender, address, parent info, income)
- ✅ Populate `institution_fees` with sample data
- ✅ Show you a summary of what was fixed

### Step 4: Verify the Fix
After running the script, you should see output like:
```
========================================
DATABASE FIX COMPLETED!
========================================
Total Students: 10
Students with Profile Details: 10
Students Missing Details: 0
Institution Fee Records: 19
========================================
SUCCESS: All students have complete profile details!
```

### Step 5: Test Your Deployed App
1. Go to your deployed frontend URL
2. Login as Admin
3. Click on any application
4. You should NOW see:
   - ✅ Date of Birth
   - ✅ Phone Number
   - ✅ Gender
   - ✅ Address
   - ✅ Father Name, Occupation, Income
   - ✅ Mother Name, Occupation, Income

## What This Script Does

### For Each Existing Student, It Creates:
- **Phone:** Random 10-digit mobile number (starting with 9)
- **Date of Birth:** Random date between 1995-2022
- **Gender:** Random (Male/Female)
- **Address:** Based on their district and region
- **Academic Year:** 2024-25
- **Father Details:**
  - Name: "Father of [Student Name]"
  - Aadhaar: Random 12-digit number
  - Occupation: Random (Farmer, Teacher, Daily Wage Worker, etc.)
  - Annual Income: Random between ₹30,000 - ₹180,000
- **Mother Details:**
  - Name: "Mother of [Student Name]"
  - Aadhaar: Random 12-digit number
  - Occupation: Random (Homemaker, Teacher, Nurse, etc.)
  - Annual Income: Random between ₹20,000 - ₹120,000

### Institution Fees
Adds sample fee data for common institutions:
- BMS College of Engineering (₹65,000 - ₹80,000)
- State University (₹35,000 - ₹45,000)
- Government High School (₹5,000 - ₹6,500)
- National Public School (₹45,000 - ₹50,000)
- Christ University (₹125,000 - ₹130,000)
- And more...

## Troubleshooting

### If the script fails:
1. Check if you have the correct database selected
2. Make sure you have admin permissions
3. Try running each section separately:
   - First: Fix institution_fees
   - Second: Create student_profile_details table
   - Third: Populate student_profile_details
   - Fourth: Populate institution_fees

### If you still see dashes after running:
1. Check Supabase logs for errors
2. Verify the data was inserted:
   ```sql
   SELECT COUNT(*) FROM student_profile_details;
   ```
3. Make sure your backend is connecting to the correct database
4. Clear browser cache and refresh

## Need Real Data Instead of Dummy Data?

If you want to manually enter real student data:
1. Use the Supabase Table Editor
2. Go to: Tables → student_profile_details
3. Click on each student row
4. Edit the fields with real information
5. Click "Save"

## After Running This Script

You should:
1. ✅ See all student details in the Admin Portal
2. ✅ No more 500 errors on `/api/admin/applications/:id`
3. ✅ Application submissions work correctly
4. ✅ Fee eligibility checks work
5. ✅ Income verification displays properly
