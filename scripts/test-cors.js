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
    const response = await fetch("https://monado-twist.vercel.app/api/win", {
      "headers": {
        "accept": "*/*",
        "accept-language": "en-US,en;q=0.9",
        "content-type": "application/json",
        "priority": "u=1, i",
        "sec-ch-ua": "\"Not;A=Brand\";v=\"99\", \"Google Chrome\";v=\"139\", \"Chromium\";v=\"139\"",
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "\"Windows\"",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "sec-fetch-storage-access": "active",
        "Referer": "https://monado-twist.vercel.app/"
      },
      "body": "{\"to\":\"0xe6CfdAf74bFEC00FafdE9724A46cb052548C8488\",\"amount\":0.09,\"fid\":249702,\"pfpUrl\":\"https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/b88d0e31-207f-4384-4ee9-211e8ebdfd00/original\",\"randomKey\":\"2frip0nf1lf_1755938770583\",\"fusedKey\":\"0x97c52344654c045ced966e405a336c5a18ab1d7717dd7164797701cb6035ea36\"}",
      "method": "POST"
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
