# User ID Encryption for n8n Webhook Storage

This plugin now encrypts user IDs before sending them to n8n webhooks, ensuring that sensitive user information is protected in transit and in n8n workflows.

## How It Works

1. **Encryption**: User IDs are encrypted using AES-256-CBC encryption before being added to URLs or POST data
2. **Verification**: A hash is included for additional security verification
3. **Decryption**: n8n workflows can decrypt the user ID using provided utility functions

## Setup

### 1. Environment Variables

Set the encryption secret key in both NocoBase and n8n environments:

```bash
# In NocoBase .env file
N8N_ATTACHMENT_SECRET_KEY=your-super-secret-key-here

# In n8n environment (however you configure n8n)
N8N_ATTACHMENT_SECRET_KEY=your-super-secret-key-here
```

**Important**: Use a strong, unique secret key for production environments!

### 2. NocoBase Configuration

The plugin will automatically use the environment variable. If not set, it falls back to a default key (not recommended for production).

### 3. n8n Workflow Setup

Copy the decryption code from `src/server/utils/n8n-helpers.ts` into your n8n JavaScript function nodes.

## URL Format

### Before (Unencrypted)
```
http://your-n8n-webhook?userId=123&fileId=456&...
```

### After (Encrypted)
```
http://your-n8n-webhook?userId=a1b2c3d4e5f6:9876543210abcdef&userHash=abc123&fileId=456&...
```

## n8n Workflow Example

```javascript
const crypto = require('crypto');

// Copy the decryption functions here (from n8n-helpers.ts)
function decryptUserId(encryptedUserId, secretKey) { ... }
function verifyUserHash(userId, fileId, userHash, secretKey) { ... }

// Get the secret key from environment or use default
const secretKey = process.env.N8N_ATTACHMENT_SECRET_KEY || 'nocobase-n8n-attachment-secret-key-2024';

// Decrypt user ID from the request
const encryptedUserId = $json.body.userId || $json.query.userId;
const userId = decryptUserId(encryptedUserId, secretKey);

// Verify the hash for security
const fileId = $json.body.fileId || $json.query.fileId;
const userHash = $json.body.userHash || $json.query.userHash;
const isValid = verifyUserHash(userId, fileId, userHash, secretKey);

if (!isValid) {
  throw new Error('Invalid user hash - potential security issue');
}

console.log('Decrypted user ID:', userId);

// Use the userId in your workflow...
return { userId, fileId, verified: true };
```

## Security Features

1. **AES-256-CBC Encryption**: Strong encryption algorithm
2. **Random IV**: Each encryption uses a unique initialization vector
3. **Hash Verification**: Additional hash prevents tampering
4. **Environment-based Keys**: Secret keys from environment variables
5. **Error Handling**: Graceful handling of decryption failures

## Testing

You can test the encryption/decryption locally:

```javascript
// In NocoBase console or test script
import { UserIdEncryption } from './src/server/utils/encryption';

const userId = '123';
const encrypted = UserIdEncryption.encrypt(userId);
console.log('Encrypted:', encrypted);

const decrypted = UserIdEncryption.decrypt(encrypted);
console.log('Decrypted:', decrypted);
```

## Troubleshooting

1. **Decryption fails**: Check that the secret key is the same in both NocoBase and n8n
2. **Hash verification fails**: Ensure the hash function in n8n matches the one in NocoBase
3. **Empty user ID**: Check that the user context is properly available when URLs are generated

## Migration

If you have existing workflows expecting plain user IDs:

1. Update your n8n workflows to include the decryption code
2. The plugin handles both encrypted and fallback scenarios
3. Monitor logs for any decryption errors

## Files

- `src/server/utils/encryption.ts` - Main encryption/decryption utilities
- `src/server/utils/n8n-helpers.ts` - Code to copy into n8n workflows  
- `src/server/storages/n8n-webhook.ts` - Updated storage implementation
