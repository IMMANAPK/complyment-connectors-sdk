// Quick test for Tenable.io connector
// Run: npx tsx tests/tenable-quick-test.js

const axios = require('axios');

// Test configuration
const config = {
  baseUrl: 'https://cloud.tenable.com',
  accessKey: '93b2d10e345f5fd5a667e53c677f44791139e4a2a6dc690488166a356169aa5f',
  secretKey: 'ea9008279271b9472762684c63313c19effa3e7a11aba18b543704afd808460b',
};

console.log('='.repeat(60));
console.log('TENABLE.IO API DIRECT TEST');
console.log('='.repeat(60));

async function testTenableApi() {
  const headers = {
    'X-ApiKeys': `accessKey=${config.accessKey}; secretKey=${config.secretKey}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  try {
    // Test 1: Server Properties (Connection Test)
    console.log('\n🔍 Test 1: Testing connection (Server Properties)...');
    const serverResponse = await axios.get(`${config.baseUrl}/server/properties`, { headers, timeout: 30000 });
    console.log('   ✅ Connected successfully!');
    console.log(`   Server Version: ${serverResponse.data.server_version || 'N/A'}`);
    console.log(`   Nessus Type: ${serverResponse.data.nessus_type || 'N/A'}`);

    // Test 2: Get Assets
    console.log('\n🔍 Test 2: Getting assets...');
    const assetsResponse = await axios.get(`${config.baseUrl}/assets`, { headers, timeout: 30000 });
    console.log(`   ✅ Assets retrieved: ${assetsResponse.data.assets?.length || 0} assets`);

    // Test 3: Get Scans
    console.log('\n🔍 Test 3: Getting scans...');
    const scansResponse = await axios.get(`${config.baseUrl}/scans`, { headers, timeout: 30000 });
    console.log(`   ✅ Scans retrieved: ${scansResponse.data.scans?.length || 0} scans`);

    // Test 4: Get Users
    console.log('\n🔍 Test 4: Getting users...');
    const usersResponse = await axios.get(`${config.baseUrl}/users`, { headers, timeout: 30000 });
    console.log(`   ✅ Users retrieved: ${usersResponse.data.users?.length || 0} users`);

    // Test 5: Get Workbench Vulnerabilities
    console.log('\n🔍 Test 5: Getting workbench vulnerabilities (last 30 days)...');
    const vulnsResponse = await axios.get(`${config.baseUrl}/workbenches/vulnerabilities?date_range=30`, { headers, timeout: 60000 });
    console.log(`   ✅ Vulnerabilities: ${vulnsResponse.data.vulnerabilities?.length || 0} found`);

    // Test 6: Get Scanners
    console.log('\n🔍 Test 6: Getting scanners...');
    const scannersResponse = await axios.get(`${config.baseUrl}/scanners`, { headers, timeout: 30000 });
    console.log(`   ✅ Scanners retrieved: ${scannersResponse.data.scanners?.length || 0} scanners`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS PASSED - Tenable.io API is working!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      console.log('\n⚠️  Authentication failed. Please check your API credentials.');
    }
  }
}

testTenableApi();
