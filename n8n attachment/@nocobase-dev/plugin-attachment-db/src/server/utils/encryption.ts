/**
 * Simple encryption utility for user IDs
 * Uses AES-256-CBC encryption with a secret key
 */

import crypto from 'crypto';

// Use environment variable or fallback to a default (should be changed in production)
const SECRET_KEY = process.env.N8N_ATTACHMENT_SECRET_KEY || 'nocobase-n8n-attachment-secret-key-2024';
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // For AES, this is always 16
const DEFAULT_EXPIRATION_MINUTES = 3; // Default expiration time in minutes

export class UserIdEncryption {
  private static getKey(): Buffer {
    // Create a 32-byte key from the secret
    return crypto.createHash('sha256').update(SECRET_KEY).digest();
  }

  /**
   * Encrypt a user ID with expiration and file binding
   */
  static encrypt(userId: string | number, fileId?: string | number, expirationMinutes: number = DEFAULT_EXPIRATION_MINUTES): string {
    try {
      // Create expiration timestamp
      const expiresAt = Date.now() + (expirationMinutes * 60 * 1000);
      
      // Create random nonce for uniqueness
      const nonce = crypto.randomBytes(8).toString('hex');
      
      // Combine user ID, file ID, expiration, and nonce
      const dataToEncrypt = `${userId}|${fileId || 'any'}|${expiresAt}|${nonce}`;
      
      const key = this.getKey();
      const iv = crypto.randomBytes(IV_LENGTH);
      const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
      
      let encrypted = cipher.update(dataToEncrypt, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Combine IV and encrypted data
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      console.error('Error encrypting user ID:', error);
      // Return a safe fallback
      return 'encrypted-error';
    }
  }

  /**
   * Decrypt a user ID and validate expiration and file access
   */
  static decrypt(encryptedUserId: string, expectedFileId?: string | number): { userId: string; fileId: string; isValid: boolean; error?: string } | null {
    try {
      if (encryptedUserId === 'lookup-via-fileId' || encryptedUserId === 'encrypted-error') {
        return {
          userId: encryptedUserId,
          fileId: 'unknown',
          isValid: false,
          error: 'Fallback value used'
        };
      }

      const parts = encryptedUserId.split(':');
      if (parts.length !== 2) {
        console.error('Invalid encrypted user ID format');
        return null;
      }

      const iv = Buffer.from(parts[0], 'hex');
      const encryptedData = parts[1];
      const key = this.getKey();
      
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      // Parse the decrypted data
      const dataParts = decrypted.split('|');
      if (dataParts.length !== 4) {
        return {
          userId: 'unknown',
          fileId: 'unknown',
          isValid: false,
          error: 'Invalid data format'
        };
      }

      const [userId, fileId, expiresAtStr, nonce] = dataParts;
      const expiresAt = parseInt(expiresAtStr, 10);
      
      // Check expiration
      const isExpired = Date.now() > expiresAt;
      if (isExpired) {
        const expiredMinutesAgo = Math.floor((Date.now() - expiresAt) / (60 * 1000));
        return {
          userId,
          fileId,
          isValid: false,
          error: `Token expired ${expiredMinutesAgo} minutes ago`
        };
      }

      // Check file ID if provided
      if (expectedFileId && fileId !== 'any' && fileId !== expectedFileId.toString()) {
        return {
          userId,
          fileId,
          isValid: false,
          error: `File ID mismatch. Expected: ${expectedFileId}, Got: ${fileId}`
        };
      }

      return {
        userId,
        fileId,
        isValid: true
      };
    } catch (error) {
      console.error('Error decrypting user ID:', error);
      return {
        userId: 'unknown',
        fileId: 'unknown',
        isValid: false,
        error: `Decryption failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Create a secure hash for additional verification
   */
  static createHash(data: string): string {
    return crypto.createHash('sha256').update(data + SECRET_KEY).digest('hex').substring(0, 16);
  }

  /**
   * Verify a hash
   */
  static verifyHash(data: string, hash: string): boolean {
    return this.createHash(data) === hash;
  }
}
