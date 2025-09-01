import crypto from 'crypto';

// Encryption configuration
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // For GCM, this is 12-16 bytes
const SALT_LENGTH = 32; // 32 bytes salt
const TAG_LENGTH = 16; // GCM tag length

// Environment variables for encryption keys
const FRONTEND_ENCRYPTION_KEY = process.env.FRONTEND_ENCRYPTION_KEY; // Key frontend uses to encrypt
const BACKEND_DECRYPTION_KEY = process.env.BACKEND_DECRYPTION_KEY;   // Key backend uses to decrypt
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
  const data = `${timestamp}:${PAYLOAD_SALT_SECRET}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Derive encryption key from base key and salt
 */
function deriveKey(baseKey: string, salt: string): Buffer {
  return crypto.pbkdf2Sync(baseKey, salt, 100000, 32, 'sha256');
}

/**
 * Encrypt payload data (used by frontend)
 */
export function encryptPayload(data: any): EncryptedPayload {
  if (!FRONTEND_ENCRYPTION_KEY) {
    throw new Error('Frontend encryption key not configured');
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
  
  // Derive key from base key and salt
  const derivedKey = deriveKey(FRONTEND_ENCRYPTION_KEY, salt);
  
  // Encrypt using XOR (simple but effective for demonstration)
  const dataBytes = Buffer.from(jsonData, 'utf8');
  const keyBytes = derivedKey;
  
  const encrypted = Buffer.alloc(dataBytes.length);
  for (let i = 0; i < dataBytes.length; i++) {
    encrypted[i] = dataBytes[i] ^ keyBytes[i % keyBytes.length];
  }
  
  const encryptedHex = encrypted.toString('hex');
  
  // Generate HMAC for authentication
  const keyHex = derivedKey.toString('hex');
  const hmac = crypto.createHmac('sha256', keyHex);
  hmac.update(encryptedHex);
  const tag = hmac.digest();

  return {
    encryptedData: encryptedHex,
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
    salt: salt,
    timestamp: timestamp
  };
}

/**
 * Decrypt payload data (used by backend)
 */
export function decryptPayload(encryptedPayload: EncryptedPayload): DecryptedPayload {
  if (!BACKEND_DECRYPTION_KEY) {
    throw new Error('Backend decryption key not configured');
  }

  try {
    const { encryptedData, iv, tag, salt, timestamp } = encryptedPayload;
    
    // Validate timestamp (reject requests older than 5 minutes)
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    if (now - timestamp > fiveMinutes) {
      throw new Error('Encrypted payload expired');
    }

    // Derive key from base key and salt
    const derivedKey = deriveKey(BACKEND_DECRYPTION_KEY, salt);
    
    // Verify HMAC tag first
    const keyHex = derivedKey.toString('hex');
    const hmac = crypto.createHmac('sha256', keyHex);
    hmac.update(encryptedData);
    const expectedTag = hmac.digest('hex');
    
    if (expectedTag !== tag) {
      throw new Error('Authentication tag verification failed');
    }
    
    // Decrypt using XOR (matching frontend implementation)
    const encryptedBytes = Buffer.from(encryptedData, 'hex');
    const keyBytes = derivedKey;
    
    const decrypted = Buffer.alloc(encryptedBytes.length);
    for (let i = 0; i < encryptedBytes.length; i++) {
      decrypted[i] = encryptedBytes[i] ^ keyBytes[i % keyBytes.length];
    }
    
    const decryptedText = decrypted.toString('utf8');
    
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

  if (!FRONTEND_ENCRYPTION_KEY || FRONTEND_ENCRYPTION_KEY.length < 32) {
    errors.push('FRONTEND_ENCRYPTION_KEY must be at least 32 characters');
  }

  if (!BACKEND_DECRYPTION_KEY || BACKEND_DECRYPTION_KEY.length < 32) {
    errors.push('BACKEND_DECRYPTION_KEY must be at least 32 characters');
  }

  if (!PAYLOAD_SALT_SECRET || PAYLOAD_SALT_SECRET.length < 16) {
    errors.push('PAYLOAD_SALT_SECRET must be at least 16 characters');
  }

  // Keys should be different for security
  if (FRONTEND_ENCRYPTION_KEY === BACKEND_DECRYPTION_KEY) {
    errors.push('FRONTEND_ENCRYPTION_KEY and BACKEND_DECRYPTION_KEY should be different');
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
