// Script to test CORS implementation
// Run this from a different origin to test that requests are rejected

async function testWinEndpoint() {
  console.log("Testing CORS for Win endpoint...");
  
  const testData = {
    to: "0x1234567890123456789012345678901234567890",
    amount: 0.01,
    fid: 123,
    pfpUrl: "https://example.com/avatar.png",
    randomKey: "test",
    fusedKey: "invalid"
  };

  try {
    const response = await fetch('https://monado-twist.vercel.app/api/win', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    console.log(`Status: ${response.status}`);
    console.log(`Status Text: ${response.statusText}`);
    
    if (response.status === 403) {
      console.log("✅ CORS is properly blocking requests from unauthorized origins");
    } else {
      console.log("❌ CORS might not be properly implemented");
    }
    
    try {
      const data = await response.json();
      console.log("Response data:", data);
    } catch (err) {
      console.log("No JSON response (expected for CORS blocks)");
    }
  } catch (error) {
    console.log("Network error (this is expected if CORS is working):", error.message);
    console.log("✅ CORS is properly blocking requests from unauthorized origins");
  }
}

// Run the test
testWinEndpoint();

// Instructions to run this test:
// 1. Save this file as test-cors.js
// 2. Run it from a local server or any domain that is not monado-twist.vercel.app
// 3. If CORS is working, the request should be blocked with a 403 Forbidden error
console.log("\nTo properly test CORS:");
console.log("1. Run this script from a domain other than monado-twist.vercel.app");
console.log("2. If your request is rejected with 403, CORS is working correctly");
console.log("3. If your request goes through, CORS is not properly implemented");
