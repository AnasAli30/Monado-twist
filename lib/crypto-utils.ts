import crypto from 'crypto';

// Encryption configuration
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // For GCM, this is 12-16 bytes
const SALT_LENGTH = 32; // 32 bytes salt
const TAG_LENGTH = 16; // GCM tag length

// Environment variables for encryption keys
const ENCRYPTION_KEY = process.env.FRONTEND_ENCRYPTION_KEY || process.env.BACKEND_DECRYPTION_KEY; // Shared key
const PAYLOAD_SALT_SECRET = process.env.PAYLOAD_SALT_SECRET || '';   // Secret for generating salts

// In-memory store for used nonces to prevent replay attacks
// In production, consider using Redis or database for persistence
const usedNonces = new Set<string>();
const NONCE_EXPIRY_TIME = 10 * 60 * 1000; // 10 minutes

// Store for browser fingerprints to detect automation
const browserFingerprints = new Map<string, { count: number; lastSeen: number }>();
const MAX_FINGERPRINT_REQUESTS = 5; // Max requests per fingerprint per hour
const FINGERPRINT_RESET_TIME = 60 * 60 * 1000; // 1 hour

interface EncryptedPayload {
  encryptedData: string;
  iv: string;
  tag: string;
  salt: string;
  timestamp: number;
  nonce: string;
}

interface DecryptedPayload {
  data: any;
  salt: string;
  timestamp: number;
  nonce: string;
}

/**
 * Generate a cryptographically secure salt
 */
function generateSalt(): string {
  return crypto.randomBytes(SALT_LENGTH).toString('hex');
}

/**
 * Generate a deterministic salt based on timestamp and secret
 */
function generateTimestampSalt(timestamp: number): string {
  const data = ENCRYPTION_KEY + timestamp.toString();
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Generate a cryptographically secure nonce
 */
function generateSecureNonce(): string {
  const timestamp = Date.now().toString(36);
  const randomBytes = crypto.randomBytes(16).toString('hex');
  const combined = timestamp + randomBytes;
  return Buffer.from(combined).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
}

/**
 * Generate nonce-based salt
 */
function generateNonceSalt(nonce: string, timestamp: number): string {
  const data = ENCRYPTION_KEY + nonce + timestamp.toString();
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Check if nonce has been used before (replay attack prevention)
 */
function isNonceUsed(nonce: string): boolean {
  return usedNonces.has(nonce);
}

/**
 * Mark nonce as used
 */
function markNonceAsUsed(nonce: string): void {
  usedNonces.add(nonce);
  
  // Clean up old nonces periodically (simple cleanup)
  if (usedNonces.size > 10000) {
    // In production, implement proper cleanup based on timestamps
    // For now, clear all nonces (they'll be re-added as needed)
    usedNonces.clear();
  }
}

/**
 * Validate nonce for replay attack prevention
 */
function validateNonce(nonce: string, timestamp: number): boolean {
  // Check if nonce is already used
  if (isNonceUsed(nonce)) {
    return false;
  }
  
  // Check if nonce is too old (additional security layer)
  const now = Date.now();
  if (now - timestamp > NONCE_EXPIRY_TIME) {
    return false;
  }
  
  // Mark nonce as used
  markNonceAsUsed(nonce);
  return true;
}

/**
 * Validate browser fingerprint for automation detection
 */
function validateBrowserFingerprint(fingerprint: string, challenge: string, solution: string): boolean {
  try {
    // Clean up old fingerprints
    const now = Date.now();
    const entries = Array.from(browserFingerprints.entries());
    for (const [fp, data] of entries) {
      if (now - data.lastSeen > FINGERPRINT_RESET_TIME) {
        browserFingerprints.delete(fp);
      }
    }
    
    // Check if fingerprint exists and validate rate limiting
    const existing = browserFingerprints.get(fingerprint);
    if (existing) {
      if (existing.count >= MAX_FINGERPRINT_REQUESTS) {
        console.log('Browser fingerprint rate limit exceeded:', fingerprint);
        return false;
      }
      existing.count++;
      existing.lastSeen = now;
    } else {
      browserFingerprints.set(fingerprint, { count: 1, lastSeen: now });
    }
    
    // Validate browser challenge
    return validateBrowserChallenge(challenge, solution);
  } catch (error) {
    console.error('Browser fingerprint validation error:', error);
    return false;
  }
}

/**
 * Validate browser challenge
 */
function validateBrowserChallenge(challenge: string, solution: string): boolean {
  try {
    const challengeData = JSON.parse(Buffer.from(challenge, 'base64').toString());
    const expectedSolution = crypto.createHash('sha256').update(JSON.stringify(challengeData)).digest('hex');
    return expectedSolution === solution;
  } catch (error) {
    return false;
  }
}

/**
 * Simple key derivation that matches frontend
 */
function deriveKey(baseKey: string, salt: string): string {
  const data = baseKey + salt;
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Simple XOR decryption that matches frontend
 */
function simpleXorDecrypt(encryptedBase64: string, key: string): string {
  const encrypted = Buffer.from(encryptedBase64, 'base64').toString('binary');
  const result = [];
  for (let i = 0; i < encrypted.length; i++) {
    result.push(String.fromCharCode(encrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length)));
  }
  return result.join('');
}

/**
 * Simple hash function that matches frontend
 */
function simpleHash(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

/**
 * Encrypt payload data (used by frontend)
 * Enhanced with nonce for additional security
 */
export function encryptPayload(data: any): EncryptedPayload {
  if (!ENCRYPTION_KEY) {
    throw new Error('Encryption key not configured');
  }

  const timestamp = Date.now();
  const salt = generateSalt();
  const nonce = generateSecureNonce();
  const timestampSalt = generateTimestampSalt(timestamp);
  const nonceSalt = generateNonceSalt(nonce, timestamp);
  
  // Add salt and nonce to the data for additional security
  const dataWithSecurity = {
    ...data,
    _salt: timestampSalt,
    _timestamp: timestamp,
    _nonce: nonce,
    _nonceSalt: nonceSalt
  };

  const jsonData = JSON.stringify(dataWithSecurity);
  const iv = crypto.randomBytes(IV_LENGTH);
  
  // Enhanced key derivation using nonce
  const derivedKey = deriveKey(ENCRYPTION_KEY, salt + nonce);
  
  // Simple XOR encryption matching frontend
  const result = [];
  for (let i = 0; i < jsonData.length; i++) {
    result.push(String.fromCharCode(jsonData.charCodeAt(i) ^ derivedKey.charCodeAt(i % derivedKey.length)));
  }
  const encryptedData = Buffer.from(result.join(''), 'binary').toString('base64');
  
  // Generate authentication tag including nonce
  const tag = simpleHash(derivedKey + encryptedData + nonce);

  return {
    encryptedData: encryptedData,
    iv: iv.toString('hex'),
    tag: tag,
    salt: salt,
    timestamp: timestamp,
    nonce: nonce
  };
}

/**
 * Decrypt payload data (used by backend)
 */
export function decryptPayload(encryptedPayload: EncryptedPayload): DecryptedPayload {
  if (!ENCRYPTION_KEY) {
    throw new Error('Decryption key not configured');
  }

  try {
    const { encryptedData, iv, tag, salt, timestamp, nonce } = encryptedPayload;
    
    // Validate timestamp (reject requests older than 5 minutes)
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    if (now - timestamp > fiveMinutes) {
      throw new Error('Encrypted payload expired');
    }

    // Validate nonce for replay attack prevention
    if (!validateNonce(nonce, timestamp)) {
      throw new Error('Invalid or reused nonce');
    }

    // Enhanced key derivation using nonce
    const derivedKey = deriveKey(ENCRYPTION_KEY, salt + nonce);
    
    // Verify authentication tag including nonce
    const expectedTag = simpleHash(derivedKey + encryptedData + nonce);
    
    if (expectedTag !== tag) {
      throw new Error('Authentication tag verification failed');
    }
    
    // Decrypt using simple XOR matching frontend
    const decryptedText = simpleXorDecrypt(encryptedData, derivedKey);
    
    const parsedData = JSON.parse(decryptedText);
    
    // Validate the internal timestamp salt
    const expectedTimestampSalt = generateTimestampSalt(timestamp);
    if (parsedData._salt !== expectedTimestampSalt) {
      throw new Error('Invalid payload salt');
    }

    // Validate internal timestamp matches
    if (parsedData._timestamp !== timestamp) {
      throw new Error('Timestamp mismatch');
    }

    // Validate the internal nonce salt
    const expectedNonceSalt = generateNonceSalt(nonce, timestamp);
    if (parsedData._nonceSalt !== expectedNonceSalt) {
      throw new Error('Invalid payload nonce salt');
    }

    // Validate internal nonce matches
    if (parsedData._nonce !== nonce) {
      throw new Error('Nonce mismatch');
    }

    // Validate browser fingerprint if present
    if (parsedData._browserFingerprint && parsedData._browserChallenge && parsedData._browserSolution) {
      if (!validateBrowserFingerprint(parsedData._browserFingerprint, parsedData._browserChallenge, parsedData._browserSolution)) {
        throw new Error('Invalid browser fingerprint or challenge');
      }
    }

    // Remove internal security fields
    const { _salt, _timestamp, _nonce, _nonceSalt, _browserFingerprint, _browserSalt, _browserChallenge, _browserSolution, ...cleanData } = parsedData;

    return {
      data: cleanData,
      salt: salt,
      timestamp: timestamp,
      nonce: nonce
    };
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt payload');
  }
}

/**
 * Validate encryption configuration
 */
export function validateCryptoConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) {
    errors.push('ENCRYPTION_KEY must be at least 32 characters');
  }

  if (!PAYLOAD_SALT_SECRET || PAYLOAD_SALT_SECRET.length < 16) {
    errors.push('PAYLOAD_SALT_SECRET must be at least 16 characters');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Generate secure random key for environment variables
 */
export function generateSecureKey(): string {
  return crypto.randomBytes(32).toString('hex');
}
