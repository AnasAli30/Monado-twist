# Payload Encryption Setup

This document explains how to set up encrypted payload communication between frontend and backend for enhanced security.

## Overview

The system uses AES-256-GCM encryption with separate keys for frontend encryption and backend decryption. This ensures that even if the frontend encryption key is compromised, attackers cannot decrypt the payloads without the backend decryption key.

## Security Features

1. **Separate Keys**: Frontend uses one key to encrypt, backend uses a different key to decrypt
2. **Salt-based Key Derivation**: Each request uses a unique salt for key derivation
3. **Timestamp Validation**: Encrypted payloads expire after 5 minutes
4. **Authentication Tags**: GCM mode provides built-in authentication
5. **Internal Salt Validation**: Additional salt validation for payload integrity

## Environment Variables Required

### Backend Environment Variables (.env.local or server environment)

```bash
# Backend decryption key (server-only, never expose to frontend)
BACKEND_DECRYPTION_KEY=your_64_character_hex_string_here_backend_key_secret

# Frontend encryption key (this will be exposed to frontend)
FRONTEND_ENCRYPTION_KEY=your_64_character_hex_string_here_frontend_key_secret

# Salt secret for additional security
PAYLOAD_SALT_SECRET=your_32_character_secret_for_salt_generation_here
```

### Frontend Environment Variables (.env.local)

```bash
# Frontend encryption key (exposed to browser)
NEXT_PUBLIC_FRONTEND_ENCRYPTION_KEY=your_64_character_hex_string_here_frontend_key_secret
```

## Key Generation

You can generate secure keys using Node.js:

```javascript
const crypto = require('crypto');

// Generate backend decryption key (64 chars)
console.log('BACKEND_DECRYPTION_KEY=' + crypto.randomBytes(32).toString('hex'));

// Generate frontend encryption key (64 chars) 
console.log('FRONTEND_ENCRYPTION_KEY=' + crypto.randomBytes(32).toString('hex'));

// Generate salt secret (32 chars)
console.log('PAYLOAD_SALT_SECRET=' + crypto.randomBytes(16).toString('hex'));
```

## Important Security Notes

1. **Different Keys**: `BACKEND_DECRYPTION_KEY` and `FRONTEND_ENCRYPTION_KEY` MUST be different
2. **Key Rotation**: Regularly rotate encryption keys for maximum security
3. **Environment Security**: Keep `BACKEND_DECRYPTION_KEY` and `PAYLOAD_SALT_SECRET` secret
4. **HTTPS Only**: Always use HTTPS in production to protect encrypted payloads in transit

## API Usage

### Frontend (Encrypting Requests)

```typescript
import { makeEncryptedRequest } from '@/lib/frontend-crypto';

// For win.ts API
const winData = {
  to: userAddress,
  amount: winAmount,
  fid: userId,
  pfpUrl: profilePicUrl,
  randomKey: generatedRandomKey,
  fusedKey: generatedFusedKey
};

const response = await makeEncryptedRequest('/api/win', winData);

// For generate-signature.ts API  
const signatureData = {
  userAddress: address,
  tokenAddress: tokenAddr,
  amount: tokenAmount,
  tokenName: token,
  name: userName,
  randomKey: generatedRandomKey,
  fusedKey: generatedFusedKey,
  pfpUrl: profilePicUrl
};

const response = await makeEncryptedRequest('/api/generate-signature', signatureData);
```

### Backend (Automatic Decryption)

The backend APIs automatically handle decryption. No changes needed to existing API calls.

## Backward Compatibility

During the transition period, both APIs support:
- **Encrypted payloads**: `{ encryptedPayload: {...} }`
- **Unencrypted payloads**: `{ to, amount, fid, ... }` (deprecated)

## Error Handling

Common encryption/decryption errors:

1. **"Crypto configuration error"**: Missing or invalid environment variables
2. **"Failed to decrypt payload"**: Invalid encryption key or corrupted payload
3. **"Encrypted payload expired"**: Request older than 5 minutes
4. **"Invalid payload salt"**: Payload integrity check failed

## Testing

1. Set up environment variables
2. Test with encrypted requests
3. Verify decryption works correctly
4. Test error handling for invalid payloads

## Migration Steps

1. Add environment variables to your deployment
2. Update frontend to use encrypted requests
3. Test thoroughly in staging environment
4. Deploy to production
5. Monitor for any decryption errors
6. Eventually remove backward compatibility for unencrypted payloads

## Security Audit Checklist

- [ ] Different keys for frontend/backend
- [ ] Keys are at least 64 characters (32 bytes)
- [ ] Backend keys are not exposed to frontend
- [ ] HTTPS is enabled in production
- [ ] Key rotation schedule is established
- [ ] Error handling doesn't leak sensitive information
- [ ] Payload expiration is working (5 minutes)
- [ ] Salt validation is functioning correctly


