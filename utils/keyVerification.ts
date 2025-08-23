import { ethers } from 'ethers';

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
  const newBody = {
    ...body,
    randomKey,
    fusedKey
  };

  // Create new options with updated body
  const newOptions = {
    ...options,
    body: JSON.stringify(newBody)
  };

  return fetch(url, newOptions);
} 