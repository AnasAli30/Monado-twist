import { ethers } from 'ethers';
import { encryptPayload, validateFrontendCryptoConfig } from '@/lib/frontend-crypto';

// Only use the public key salt in the frontend
// The SERVER_SECRET_KEY remains server-side only
const PUBLIC_KEY_SALT = process.env.NEXT_PUBLIC_KEY_SALT || "default-public-salt";

export function generateVerificationKeys() {
  // Create random key with timestamp to prevent replay attacks
  const randomKey = Math.random().toString(36).substring(2, 15) + '_' + Date.now().toString();
  
  // Step 1: Combine random key with public salt
  const publicVerificationString = randomKey + PUBLIC_KEY_SALT;
  
  // Step 2: Generate first-level hash
  // The server will recreate this hash and then enhance it with SERVER_SECRET_KEY
  const clientHash = ethers.keccak256(ethers.toUtf8Bytes(publicVerificationString));
  
  // The server expects this exact hash as the fusedKey
  const fusedKey = clientHash;
  
  return { randomKey, fusedKey };
}

export async function fetchWithVerification(url: string, options: RequestInit = {}) {
  const { randomKey, fusedKey } = generateVerificationKeys();
  
  // Ensure body is an object
  const body = options.body ? JSON.parse(options.body as string) : {};
  
  // Add verification keys to the body
  const bodyWithKeys = {
    ...body,
    randomKey,
    fusedKey
  };

  // Check if this is a request to win or generate-signature APIs that support encryption
  const shouldEncrypt = url.includes('/api/win') || url.includes('/api/generate-signature');
  
  let finalBody;
  if (shouldEncrypt) {
    // Validate encryption config before attempting to encrypt
    if (validateFrontendCryptoConfig()) {
      try {
        // Encrypt the payload for secure APIs
        const encryptedPayload = await encryptPayload(bodyWithKeys);
        finalBody = JSON.stringify({ encryptedPayload });
        console.log('🔐 Sending encrypted payload to:', url);
      } catch (error) {
        console.error('Encryption failed, falling back to unencrypted:', error);
        // Fall back to unencrypted if encryption fails
        finalBody = JSON.stringify(bodyWithKeys);
      }
    } else {
      console.warn('Encryption not configured, sending unencrypted payload to:', url);
      finalBody = JSON.stringify(bodyWithKeys);
    }
  } else {
    // Use unencrypted for other APIs
    finalBody = JSON.stringify(bodyWithKeys);
  }

  // Create new options with updated body
  const newOptions = {
    ...options,
    body: finalBody
  };

  return fetch(url, newOptions);
} 