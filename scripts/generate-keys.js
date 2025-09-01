const crypto = require('crypto');

console.log('='.repeat(60));
console.log('🔐 ENCRYPTION KEYS GENERATOR');
console.log('='.repeat(60));
console.log('');

// Generate backend decryption key (64 chars)
const backendKey = crypto.randomBytes(32).toString('hex');
console.log('BACKEND_DECRYPTION_KEY=' + backendKey);
console.log('Length:', backendKey.length, 'characters');
console.log('');

// Generate frontend encryption key (64 chars) 
const frontendKey = crypto.randomBytes(32).toString('hex');
console.log('FRONTEND_ENCRYPTION_KEY=' + frontendKey);
console.log('Length:', frontendKey.length, 'characters');
console.log('');

// Generate salt secret (32 chars)
const saltSecret = crypto.randomBytes(16).toString('hex');
console.log('PAYLOAD_SALT_SECRET=' + saltSecret);
console.log('Length:', saltSecret.length, 'characters');
console.log('');

console.log('='.repeat(60));
console.log('📋 COPY TO YOUR .env.local FILE:');
console.log('='.repeat(60));
console.log('');
console.log('# Backend Environment Variables (.env.local - server only)');
console.log('BACKEND_DECRYPTION_KEY=' + backendKey);
console.log('FRONTEND_ENCRYPTION_KEY=' + frontendKey);
console.log('PAYLOAD_SALT_SECRET=' + saltSecret);
console.log('');
console.log('# Frontend Environment Variables (.env.local - exposed to browser)');
console.log('NEXT_PUBLIC_FRONTEND_ENCRYPTION_KEY=' + frontendKey);
console.log('');

console.log('='.repeat(60));
console.log('⚠️  SECURITY NOTES:');
console.log('='.repeat(60));
console.log('1. Keep BACKEND_DECRYPTION_KEY and PAYLOAD_SALT_SECRET secret');
console.log('2. FRONTEND_ENCRYPTION_KEY will be exposed to browsers');
console.log('3. Store these keys securely in your deployment environment');
console.log('4. Never commit these keys to version control');
console.log('5. Rotate keys regularly for maximum security');
console.log('');

// Validation
console.log('='.repeat(60));
console.log('✅ VALIDATION:');
console.log('='.repeat(60));
console.log('Backend key length:', backendKey.length === 64 ? '✅ Valid' : '❌ Invalid');
console.log('Frontend key length:', frontendKey.length === 64 ? '✅ Valid' : '❌ Invalid');
console.log('Salt secret length:', saltSecret.length === 32 ? '✅ Valid' : '❌ Invalid');
console.log('Keys are different:', backendKey !== frontendKey ? '✅ Valid' : '❌ Invalid');
console.log('');


