// A simple script to test the email validation API
const testEmails = [
  // Organization emails (should pass)
  { email: "info@ngo.org", type: 1 },
  { email: "contact@nonprofit.ba", type: 1 },
  { email: "admin@udruzenje.net", type: 1 },
  { email: "support@organization.com", type: 1 },
  
  // Organization emails (should fail)
  { email: "info@gmail.com", type: 1 },
  { email: "contact@yahoo.com", type: 1 },
  { email: "admin@outlook.com", type: 1 },
  { email: "person@hotmail.com", type: 1 },
  
  // Individual emails (should pass)
  { email: "john@gmail.com", type: 2 },
  { email: "user@yahoo.com", type: 2 },
  { email: "person@company.com", type: 2 },
  
  // Corporation emails (should pass)
  { email: "info@corporation.com", type: 3 },
  { email: "support@company.ba", type: 3 },
  
  // Corporation emails (should fail)
  { email: "business@gmail.com", type: 3 },
  { email: "corporate@yahoo.com", type: 3 },
];

async function testEmailValidation() {
  console.log("=== Email Validation Test ===");
  
  for (const test of testEmails) {
    try {
      const response = await fetch("/api/validate-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: test.email,
          applicantTypeId: test.type
        }),
      });
      
      const result = await response.json();
      const typeLabels = {
        1: "ORGANIZATION",
        2: "INDIVIDUAL",
        3: "CORPORATION"
      };
      
      console.log(`Email: ${test.email} | Type: ${typeLabels[test.type]} | Valid: ${result.valid ? "YES" : "NO"}`);
      if (!result.valid) {
        console.log(`  - Message: ${result.message}`);
      }
    } catch (error) {
      console.error(`Error testing ${test.email}:`, error.message);
    }
  }
}

testEmailValidation();