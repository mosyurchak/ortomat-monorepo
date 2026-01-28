#!/usr/bin/env node

const API_URL = 'https://ortomat-monorepo-production.up.railway.app/api';

// Helper function for delays
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Test 1: Rate Limiting
async function testRateLimiting() {
  console.log('\n🧪 TEST 1: Rate Limiting on Login Endpoint');
  console.log('═══════════════════════════════════════════\n');

  for (let i = 1; i <= 6; i++) {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@test.com',
          password: 'wrongpassword'
        })
      });

      console.log(`Спроба ${i}: HTTP ${response.status} ${response.statusText}`);

      if (response.status === 429) {
        console.log('✅ RATE LIMITING ПРАЦЮЄ! Заблоковано після 5 спроб.\n');
        return true;
      }

      await sleep(100); // 100ms pause between requests
    } catch (error) {
      console.error(`Спроба ${i}: Error - ${error.message}`);
    }
  }

  console.log('❌ RATE LIMITING НЕ СПРАЦЮВАВ! Всі 6 спроб пройшли.\n');
  return false;
}

// Test 2: Input Validation - Short Password
async function testPasswordValidation() {
  console.log('\n🧪 TEST 2: Input Validation - Short Password');
  console.log('═══════════════════════════════════════════\n');

  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'short',  // Only 5 characters
        firstName: 'Test',
        lastName: 'User',
        phone: '+380501234567'
      })
    });

    const data = await response.json();

    console.log(`HTTP Status: ${response.status}`);
    console.log('Response:', JSON.stringify(data, null, 2));

    if (response.status === 400 &&
        data.message &&
        data.message.some(msg => msg.includes('8 символів'))) {
      console.log('✅ PASSWORD VALIDATION ПРАЦЮЄ!\n');
      return true;
    }

    console.log('❌ PASSWORD VALIDATION НЕ СПРАЦЮВАЛА!\n');
    return false;
  } catch (error) {
    console.error('Error:', error.message);
    return false;
  }
}

// Test 3: Input Validation - Invalid Phone Format
async function testPhoneValidation() {
  console.log('\n🧪 TEST 3: Input Validation - Invalid Phone Format');
  console.log('═══════════════════════════════════════════\n');

  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        phone: '1234567890'  // Invalid format
      })
    });

    const data = await response.json();

    console.log(`HTTP Status: ${response.status}`);
    console.log('Response:', JSON.stringify(data, null, 2));

    if (response.status === 400 &&
        data.message &&
        data.message.some(msg => msg.includes('+380'))) {
      console.log('✅ PHONE VALIDATION ПРАЦЮЄ!\n');
      return true;
    }

    console.log('❌ PHONE VALIDATION НЕ СПРАЦЮВАЛА!\n');
    return false;
  } catch (error) {
    console.error('Error:', error.message);
    return false;
  }
}

// Test 4: Error Message Security
async function testErrorMessageSecurity() {
  console.log('\n🧪 TEST 4: Error Message Security - Generic Messages');
  console.log('═══════════════════════════════════════════\n');

  try {
    const response = await fetch(`${API_URL}/auth/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'nonexistent@example.com'
      })
    });

    const data = await response.json();

    console.log(`HTTP Status: ${response.status}`);
    console.log('Response:', JSON.stringify(data, null, 2));

    // Check for generic message (NOT "User not found")
    if (data.message &&
        data.message.includes('If an account exists') &&
        !data.message.includes('User not found')) {
      console.log('✅ GENERIC ERROR MESSAGES ПРАЦЮЮТЬ!\n');
      console.log('Не розкриває чи існує користувач (anti user enumeration).\n');
      return true;
    }

    if (data.message && data.message.includes('User not found')) {
      console.log('❌ SECURITY ISSUE: Розкриває існування користувача!\n');
      return false;
    }

    console.log('⚠️  UNEXPECTED RESPONSE FORMAT\n');
    return false;
  } catch (error) {
    console.error('Error:', error.message);
    return false;
  }
}

// Main test runner
async function runAllTests() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║         ORTOMAT SECURITY FEATURES TEST SUITE             ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');

  const results = {
    rateLimiting: false,
    passwordValidation: false,
    phoneValidation: false,
    errorMessages: false
  };

  // Run tests
  results.rateLimiting = await testRateLimiting();
  await sleep(1000);

  results.passwordValidation = await testPasswordValidation();
  await sleep(1000);

  results.phoneValidation = await testPhoneValidation();
  await sleep(1000);

  results.errorMessages = await testErrorMessageSecurity();

  // Summary
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║                      TEST SUMMARY                         ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  console.log(`1. Rate Limiting:          ${results.rateLimiting ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`2. Password Validation:    ${results.passwordValidation ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`3. Phone Validation:       ${results.phoneValidation ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`4. Error Message Security: ${results.errorMessages ? '✅ PASS' : '❌ FAIL'}`);

  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;

  console.log(`\n${passedTests}/${totalTests} tests passed`);

  if (passedTests === totalTests) {
    console.log('\n🎉 ALL SECURITY TESTS PASSED! 🎉\n');
  } else {
    console.log(`\n⚠️  ${totalTests - passedTests} test(s) failed. Please review.\n`);
  }
}

// Run tests
runAllTests().catch(console.error);
