import crypto from 'crypto';

// Encryption configuration
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // For GCM, this is 12-16 bytes
const SALT_LENGTH = 32; // 32 bytes salt
const TAG_LENGTH = 16; // GCM tag length

// Environment variables for encryption keys
const ENCRYPTION_KEY = process.env.FRONTEND_ENCRYPTION_KEY || process.env.BACKEND_DECRYPTION_KEY; // Shared key
const PAYLOAD_SALT_SECRET = process.env.PAYLOAD_SALT_SECRET || '';   // Secret for generating salts

interface EncryptedPayload {
  encryptedData: string;
  iv: string;
  tag: string;
  salt: string;
  timestamp: number;
}

interface DecryptedPayload {
  data: any;
  salt: string;
  timestamp: number;
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
 */
export function encryptPayload(data: any): EncryptedPayload {
  if (!ENCRYPTION_KEY) {
    throw new Error('Encryption key not configured');
  }

  const timestamp = Date.now();
  const salt = generateSalt();
  const timestampSalt = generateTimestampSalt(timestamp);
  
  // Add salt to the data for additional security
  const dataWithSalt = {
    ...data,
    _salt: timestampSalt,
    _timestamp: timestamp
  };

  const jsonData = JSON.stringify(dataWithSalt);
  const iv = crypto.randomBytes(IV_LENGTH);
  
  // Simple key derivation
  const derivedKey = deriveKey(ENCRYPTION_KEY, salt);
  
  // Simple XOR encryption matching frontend
  const result = [];
  for (let i = 0; i < jsonData.length; i++) {
    result.push(String.fromCharCode(jsonData.charCodeAt(i) ^ derivedKey.charCodeAt(i % derivedKey.length)));
  }
  const encryptedData = Buffer.from(result.join(''), 'binary').toString('base64');
  
  // Generate authentication tag
  const tag = simpleHash(derivedKey + encryptedData);

  return {
    encryptedData: encryptedData,
    iv: iv.toString('hex'),
    tag: tag,
    salt: salt,
    timestamp: timestamp
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
    const { encryptedData, iv, tag, salt, timestamp } = encryptedPayload;
    
    // Validate timestamp (reject requests older than 5 minutes)
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    if (now - timestamp > fiveMinutes) {
      throw new Error('Encrypted payload expired');
    }

    // Simple key derivation matching frontend
    const derivedKey = deriveKey(ENCRYPTION_KEY, salt);
    
    // Verify authentication tag first
    const expectedTag = simpleHash(derivedKey + encryptedData);
    
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

    // Remove internal security fields
    const { _salt, _timestamp, ...cleanData } = parsedData;

    return {
      data: cleanData,
      salt: salt,
      timestamp: timestamp
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
