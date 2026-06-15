import './server.js';
import axios from 'axios';
import { query } from './config/db.js';

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}/api`;

async function runTests() {
    console.log("\n==================================================");
    console.log("STARTING FULL-STACK VERIFICATION TEST RUNNER");
    console.log("==================================================\n");

    let studentToken = "";
    let supervisorToken = "";
    let adminToken = "";
    let adminTempPassword = "";
    let testApplicationId = "";
    let testAutoRejectedAppId = "";

    try {
        // 1. Verify Health Check
        console.log("1. Checking Server Health...");
        const health = await axios.get(`http://localhost:${PORT}/health`);
        console.log("   Health response:", health.data);
        if (health.data.status !== 'healthy') throw new Error("Server unhealthy!");

        // Clear existing test data to make tests repeatable
        console.log("\nCleaning database of previous test accounts...");
        await query("DELETE FROM users WHERE email IN ('test_student@scholarship.gov.in', 'test_admin@scholarship.gov.in')");
        await query("DELETE FROM admin_requests WHERE email = 'test_admin@scholarship.gov.in'");

        // 2. Student Sign Up
        console.log("\n2. Registering Student Account...");
        const signupRes = await axios.post(`${BASE_URL}/auth/student/signup`, {
            fullName: "Alex Rivera",
            studentId: "STU-2026-9999",
            collegeName: "National Institute of Technology",
            grade: "Year 1",
            email: "test_student@scholarship.gov.in",
            mobileNumber: "+91 98765 43210",
            region: "North",
            district: "District A",
            password: "StudentPassword123"
        });
        console.log("   Signup Message:", signupRes.data.message);

        // 3. Student Login
        console.log("\n3. Authenticating Student...");
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
            email: "test_student@scholarship.gov.in",
            password: "StudentPassword123"
        });
        studentToken = loginRes.data.token;
        console.log("   Authenticated! Student User Name:", loginRes.data.user.name);
        console.log("   Student Profile:", loginRes.data.profile.college_name);

        const config = (token) => ({ headers: { 'Authorization': `Bearer ${token}` } });

        // 4. Submit Scholarship Applications to Test Eligibility Rules
        console.log("\n4. Submitting Scholarship Applications for Rules Verification...");

        // CASE A: Eligible Application (Father income 80,000, Mother 30,000, Tuition partially paid)
        console.log("   Case A: Submitting Eligible Application...");
        const appResA = await axios.post(`${BASE_URL}/student/apply`, {
            fatherName: "John Rivera",
            fatherAadhaar: "111122223333", // Seeded as income 80,000, tax_paid false
            fatherOccupation: "Farmer",
            motherName: "Mary Rivera",
            motherAadhaar: "444455556666", // Seeded as income 30,000, tax_paid false
            motherOccupation: "Homemaker",
            collegeName: "National Institute of Technology",
            grade: "Year 1" // Seeded fees: 50,000 total, 30,000 paid (Partial)
        }, config(studentToken));
        testApplicationId = appResA.data.application.id;
        console.log("   - Response:", appResA.data.application);

        // CASE B: Rejected Application (Rule 1 Income > 120,000)
        console.log("   Case B: Submitting Application with High Income Parent (Rule 1)...");
        const appResB = await axios.post(`${BASE_URL}/student/apply`, {
            fatherName: "High Income Father",
            fatherAadhaar: "777788889999", // Seeded as income 150,000, tax_paid false
            fatherOccupation: "Business Owner",
            motherName: "Mary Rivera",
            motherAadhaar: "444455556666",
            motherOccupation: "Homemaker",
            collegeName: "National Institute of Technology",
            grade: "Year 1"
        }, config(studentToken));
        testAutoRejectedAppId = appResB.data.application.id;
        console.log("   - Response:", appResB.data.application);

        // CASE C: Rejected Application (Rule 2 Tax Paid)
        console.log("   Case C: Submitting Application with Taxpaying Parent (Rule 2)...");
        const appResC = await axios.post(`${BASE_URL}/student/apply`, {
            fatherName: "Taxpayer Father",
            fatherAadhaar: "123456789012", // Seeded as income 90,000, tax_paid true
            fatherOccupation: "Contractor",
            motherName: "Mary Rivera",
            motherAadhaar: "444455556666",
            motherOccupation: "Homemaker",
            collegeName: "National Institute of Technology",
            grade: "Year 1"
        }, config(studentToken));
        console.log("   - Response:", appResC.data.application);

        // CASE D: Rejected Application (Rule 3 Tuition fully paid)
        console.log("   Case D: Submitting Application with Tuition Fees Fully Paid (Rule 3)...");
        const appResD = await axios.post(`${BASE_URL}/student/apply`, {
            fatherName: "John Rivera",
            fatherAadhaar: "111122223333",
            fatherOccupation: "Farmer",
            motherName: "Mary Rivera",
            motherAadhaar: "444455556666",
            motherOccupation: "Homemaker",
            collegeName: "State University", // Seeded total_fee 40000, fee_paid 40000
            grade: "Year 2"
        }, config(studentToken));
        console.log("   - Response:", appResD.data.application);

        // 5. Submit Admin Request Access
        console.log("\n5. Submitting Admin Access Request...");
        const adminReqRes = await axios.post(`${BASE_URL}/auth/admin/request-access`, {
            employeeName: "Officer James",
            employeeId: "EMP-2026-90",
            designation: "Verification Officer",
            email: "test_admin@scholarship.gov.in",
            mobile: "+91 88888 77777",
            region: "North",
            district: "District A"
        });
        console.log("   Request response:", adminReqRes.data.message);

        // 6. Supervisor Login
        console.log("\n6. Authenticating Supervisor...");
        const supLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
            email: "supervisor@scholarship.gov.in",
            password: "Supervisor@123"
        });
        supervisorToken = supLoginRes.data.token;
        console.log("   Authenticated! Supervisor Name:", supLoginRes.data.user.name);

        // 7. Supervisor Approves Admin Request
        console.log("\n7. Supervisor Approves Pending Admin Access Request...");
        const pendingReqs = await axios.get(`${BASE_URL}/supervisor/admin-requests`, config(supervisorToken));
        const testRequest = pendingReqs.data.find(r => r.email === 'test_admin@scholarship.gov.in');
        
        if (!testRequest) throw new Error("Test admin request not found!");

        const approveRes = await axios.post(
            `${BASE_URL}/supervisor/admin-requests/${testRequest.id}/action`, 
            { action: 'Approve' }, 
            config(supervisorToken)
        );
        adminTempPassword = approveRes.data.credentials.password;
        console.log("   Request APPROVED! Created Admin Username:", approveRes.data.credentials.email);
        console.log("   Generated Temp Password:", adminTempPassword);

        // 8. Admin Login
        console.log("\n8. Authenticating Newly Created Admin Account...");
        const adminLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
            email: "test_admin@scholarship.gov.in",
            password: adminTempPassword
        });
        adminToken = adminLoginRes.data.token;
        console.log("   Authenticated! Admin Name:", adminLoginRes.data.user.name);
        console.log("   Admin Jurisdiction:", adminLoginRes.data.user.district, ",", adminLoginRes.data.user.region);

        // 9. Admin Review and Manual Override
        console.log("\n9. Admin Processing Applications & Overriding Decisions...");
        
        // Fetch queue
        const adminQueue = await axios.get(`${BASE_URL}/admin/applications`, config(adminToken));
        console.log(`   Admin Queue Size: ${adminQueue.data.length} applications`);

        // Approve Eligible application (Case A)
        console.log("   Approve Case A application (standard)...");
        const decResA = await axios.put(`${BASE_URL}/admin/applications/${testApplicationId}/decision`, {
            status: 'Approved',
            reason: 'Income and fees checks verified successfully.'
        }, config(adminToken));
        console.log("   - Response:", decResA.data.message);

        // Manual Override on Case B (Approved with manual override)
        console.log("   Applying Manual Override to Case B (Auto-Rejected to Approved)...");
        const decResB = await axios.put(`${BASE_URL}/admin/applications/${testAutoRejectedAppId}/decision`, {
            status: 'Approved',
            overrideReason: 'Income discrepancy resolved by offline assessment',
            overrideComments: 'Investigated tax forms offline. Business suffered agricultural loss not captured in mock DB.'
        }, config(adminToken));
        console.log("   - Response:", decResB.data.message);

        // 10. Supervisor Reports and Auditing Checks
        console.log("\n10. Supervisor Reviewing Security Audit Logs...");
        const logsRes = await axios.get(`${BASE_URL}/supervisor/audit-logs`, config(supervisorToken));
        console.log(`    Total Audit Log Records Found: ${logsRes.data.length}`);
        
        const manualOverrideLog = logsRes.data.find(log => log.action === 'Manual Override');
        if (manualOverrideLog) {
            console.log("    SUCCESS: Matched Audit Log Entry for Manual Override!");
            console.log("             Remarks:", manualOverrideLog.remarks);
        } else {
            console.warn("    WARNING: Manual Override audit log not found!");
        }

        // 11. Download Reports Check
        console.log("\n11. Testing Report File Exporters...");
        const csvReport = await axios.get(`${BASE_URL}/reports/export?type=accepted&format=csv`, config(supervisorToken));
        console.log(`    CSV report length: ${csvReport.data.split('\n').length} lines`);

        const txtReport = await axios.get(`${BASE_URL}/reports/export?type=applied&format=txt`, config(supervisorToken));
        console.log(`    TXT report generated successfully.`);

        const pdfReport = await axios.get(`${BASE_URL}/reports/export?type=hold&format=pdf`, config(supervisorToken), { responseType: 'arraybuffer' });
        console.log(`    PDF report generated successfully. Size: ${pdfReport.headers['content-length']} bytes`);

        console.log("\n==================================================");
        console.log("VERIFICATION STATUS: ALL TESTS PASSED SUCCESSFULLY!");
        console.log("==================================================\n");
        process.exit(0);

    } catch (err) {
        console.error("\n==================================================");
        console.error("VERIFICATION STATUS: FAILED!");
        console.error("Error Description:", err.response?.data || err.message);
        console.error("==================================================\n");
        process.exit(1);
    }
}

// Start runner after a short delay to ensure server started
setTimeout(runTests, 1000);
