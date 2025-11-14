/**
 * Simple test for encryption functionality
 * Run this to verify encryption/decryption is working
 */

import { UserIdEncryption } from '../server/utils/encryption';

// Test encryption and decryption
const testUserId = '12345';
const testFileId = 'file-67890';

console.log('=== Encryption Test ===');
console.log('Original User ID:', testUserId);

// Test encryption
const encrypted = UserIdEncryption.encrypt(testUserId);
console.log('Encrypted User ID:', encrypted);

// Test decryption
const decrypted = UserIdEncryption.decrypt(encrypted);
console.log('Decrypted User ID:', decrypted);

// Test hash creation and verification
const hash = UserIdEncryption.createHash(testUserId + testFileId);
console.log('Hash:', hash);

const isValidHash = UserIdEncryption.verifyHash(testUserId + testFileId, hash);
console.log('Hash verification:', isValidHash);

// Test with different values
const wrongHash = UserIdEncryption.verifyHash('wrong-value', hash);
console.log('Wrong hash verification (should be false):', wrongHash);

console.log('=== Test Results ===');
console.log('✓ Encryption/Decryption:', testUserId === decrypted ? 'PASS' : 'FAIL');
console.log('✓ Hash Verification:', isValidHash ? 'PASS' : 'FAIL');
console.log('✓ Wrong Hash Rejection:', !wrongHash ? 'PASS' : 'FAIL');

// Test URL-like scenario
console.log('\n=== URL Scenario Test ===');
const params = new URLSearchParams();
params.set('userId', encrypted);
params.set('userHash', hash);
params.set('fileId', testFileId);

const url = `http://example.com/webhook?${params.toString()}`;
console.log('Generated URL:', url);

// Simulate n8n receiving this URL
const urlObj = new URL(url);
const receivedUserId = urlObj.searchParams.get('userId');
const receivedHash = urlObj.searchParams.get('userHash');
const receivedFileId = urlObj.searchParams.get('fileId');

const decryptedFromUrl = UserIdEncryption.decrypt(receivedUserId!);
const hashValidFromUrl = UserIdEncryption.verifyHash(decryptedFromUrl + receivedFileId, receivedHash!);

console.log('Decrypted from URL:', decryptedFromUrl);
console.log('Hash valid from URL:', hashValidFromUrl);
console.log('✓ URL Round Trip:', testUserId === decryptedFromUrl && hashValidFromUrl ? 'PASS' : 'FAIL');
