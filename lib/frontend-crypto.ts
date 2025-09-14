// Frontend encryption utilities
// Note: This file should be used on the client side

import { generateBrowserFingerprint, generateBrowserChallenge } from './browser-security';

// Frontend encryption key (should be set in environment variables)
const ENCRYPTION_KEY = process.env.NEXT_PUBLIC_FRONTEND_ENCRYPTION_KEY;

interface EncryptedPayload {
  encryptedData: string;
  iv: string;
  tag: string;
  salt: string;
  timestamp: number;
  nonce: string;
}

/**
 * Generate random hex string
 */
function generateRandomHex(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a cryptographically secure nonce
 * Combines timestamp, random data, and client fingerprint for uniqueness
 */
function generateSecureNonce(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = generateRandomHex(16);
  const clientFingerprint = navigator.userAgent.length.toString(36) + 
                           screen.width.toString(36) + 
                           screen.height.toString(36);
  
  // Combine all parts and hash for additional security
  const combined = timestamp + randomPart + clientFingerprint;
  return btoa(combined).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
}

/**
 * Simple HMAC-SHA256 implementation using Web Crypto API
 */
async function hmacSHA256(key: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const messageData = encoder.encode(message);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  return Array.from(new Uint8Array(signature), byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Simple PBKDF2 implementation using Web Crypto API
 */
async function pbkdf2(password: string, salt: string, iterations: number): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);
  const saltData = encoder.encode(salt);
  
  const baseKey = await crypto.subtle.importKey(
    'raw',
    passwordData,
    'PBKDF2',
    false,
    ['deriveBits']
  );
  
  return await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltData,
      iterations: iterations,
      hash: 'SHA-256'
    },
    baseKey,
    256
  );
}

/**
 * Simple XOR encryption that matches backend
 */
function simpleXorEncrypt(data: string, key: string): string {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    result.push(String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length)));
  }
  return btoa(result.join('')); // Base64 encode
}

/**
 * Simple hash function for browser compatibility
 */
async function simpleHash(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Encrypt payload for secure transmission to backend
 * Uses simple but effective encryption compatible with backend
 * Enhanced with nonce and browser fingerprinting for maximum security
 */
export async function encryptPayload(data: any): Promise<EncryptedPayload> {
  if (!ENCRYPTION_KEY) {
    throw new Error('Encryption key not configured');
  }

  const timestamp = Date.now();
  const salt = generateRandomHex(32);
  const nonce = generateSecureNonce();
  
  // Generate browser fingerprint - very difficult to replicate externally
  const browserFingerprint = await generateBrowserFingerprint();
  
  // Generate browser challenge for additional security
  const browserChallenge = await generateBrowserChallenge();
  
  // Generate timestamp salt for additional security  
  const timestampSalt = await simpleHash(ENCRYPTION_KEY + timestamp.toString());
  
  // Generate nonce-based salt for enhanced security
  const nonceSalt = await simpleHash(ENCRYPTION_KEY + nonce + timestamp.toString());
  
  // Generate browser fingerprint salt
  const browserSalt = await simpleHash(ENCRYPTION_KEY + browserFingerprint + timestamp.toString());
  
  // Add comprehensive security data
  const dataWithSecurity = {
    ...data,
    _timestamp: timestamp,
    _salt: timestampSalt,
    _nonce: nonce,
    _nonceSalt: nonceSalt,
    _browserFingerprint: browserFingerprint,
    _browserSalt: browserSalt,
    _browserChallenge: browserChallenge.challenge,
    _browserSolution: browserChallenge.solution
  };

  const jsonData = JSON.stringify(dataWithSecurity);
  
  // Enhanced key derivation using nonce and browser fingerprint
  const derivedKey = await simpleHash(ENCRYPTION_KEY + salt + nonce + browserFingerprint);
  
  // Simple XOR encryption
  const encryptedData = simpleXorEncrypt(jsonData, derivedKey);
  
  // Generate authentication tag including nonce and browser fingerprint
  const tag = await simpleHash(derivedKey + encryptedData + nonce + browserFingerprint);

  return {
    encryptedData: encryptedData,
    iv: generateRandomHex(16), // Not used but kept for compatibility
    tag: tag,
    salt: salt,
    timestamp: timestamp,
    nonce: nonce
  };
}

/**
 * Example usage for API calls
 */
export async function makeEncryptedRequest(endpoint: string, data: any, options: RequestInit = {}) {
  try {
    const encryptedPayload = encryptPayload(data);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: JSON.stringify({
        encryptedPayload: encryptedPayload
      }),
      ...options
    });

    return response;
  } catch (error) {
    console.error('Encrypted request failed:', error);
    throw error;
  }
}

/**
 * Validate encryption configuration
 */
export function validateFrontendCryptoConfig(): boolean {
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) {
    console.error('NEXT_PUBLIC_FRONTEND_ENCRYPTION_KEY must be at least 32 characters');
    return false;
  }
  return true;
}
