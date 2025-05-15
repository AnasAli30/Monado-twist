import { ethers } from 'ethers';

const CLIENT_SECRET_KEY = process.env.NEXT_PUBLIC_CLIENT_SECRET_KEY || "your-client-secret-key";

export function generateVerificationKeys() {
  const randomKey = Math.random().toString(36).substring(2, 15);
  const fusedKey = ethers.keccak256(ethers.toUtf8Bytes(randomKey + CLIENT_SECRET_KEY));
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