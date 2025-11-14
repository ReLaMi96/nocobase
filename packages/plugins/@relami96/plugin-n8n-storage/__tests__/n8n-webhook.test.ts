/**
 * Example test file for n8n webhook storage
 * This shows how the storage engine could be tested
 */

import N8nWebhookStorage from '../src/server/storages/n8n-webhook';

describe('N8nWebhookStorage', () => {
  let storage: N8nWebhookStorage;

  beforeEach(() => {
    const config = {
      id: 1,
      title: 'Test n8n Storage',
      type: 'n8n-webhook',
      name: 'test-n8n',
      baseUrl: 'http://localhost:5678',
      options: {
        uploadWebhookUrl: 'http://localhost:5678/webhook/upload',
        downloadWebhookUrl: 'http://localhost:5678/webhook/download',
        deleteWebhookUrl: 'http://localhost:5678/webhook/delete',
        timeout: 30000,
      },
    };

    storage = new N8nWebhookStorage(config);
  });

  describe('defaults', () => {
    it('should return default configuration', () => {
      const defaults = N8nWebhookStorage.defaults();

      expect(defaults.title).toBe('n8n Webhook Storage');
      expect(defaults.type).toBe('n8n-webhook');
      expect(defaults.options.timeout).toBe(30000);
    });
  });

  describe('make', () => {
    it('should return storage engine with required methods', () => {
      const engine = storage.make();

      expect(engine).toHaveProperty('_handleFile');
      expect(engine).toHaveProperty('_removeFile');
      expect(typeof engine._handleFile).toBe('function');
      expect(typeof engine._removeFile).toBe('function');
    });
  });

  describe('delete', () => {
    it('should return success when no delete webhook configured', async () => {
      // Remove delete webhook URL
      storage.storage.options.deleteWebhookUrl = '';

      const mockRecords = [{ filename: 'test.txt', path: 'uploads', url: 'http://example.com/test.txt', storageId: 1 }];

      const [deletedCount, failedRecords] = await storage.delete(mockRecords as any);

      expect(deletedCount).toBe(1);
      expect(failedRecords).toEqual([]);
    });
  });

  describe('getFileURL', () => {
    it('should return file URL if available', () => {
      const file = {
        filename: 'test.txt',
        url: 'http://example.com/test.txt',
        path: 'uploads',
        storageId: 1,
      };

      const url = storage.getFileURL(file as any);
      expect(url).toBe('http://example.com/test.txt');
    });

    it('should generate URL from baseUrl if no direct URL', () => {
      const file = {
        filename: 'test.txt',
        path: 'uploads',
        storageId: 1,
      };

      const url = storage.getFileURL(file as any);
      expect(url).toBe('http://localhost:5678/file/test.txt');
    });
  });
});

// Mock implementations for testing with actual n8n webhooks
export const mockN8nUploadResponse = {
  filename: 'uploaded_file.txt',
  size: 1024,
  url: 'https://storage.example.com/files/uploaded_file.txt',
  key: 'unique_key_123',
};

export const mockN8nDownloadResponse = {
  url: 'https://storage.example.com/files/temp_download_url.txt',
};

// Example of how to set up mock n8n webhooks for testing
export function setupMockN8nWebhooks() {
  // This would typically use a testing framework like nock or msw
  // to mock HTTP requests to n8n webhooks

  return {
    uploadWebhook: 'http://localhost:5678/webhook/upload',
    downloadWebhook: 'http://localhost:5678/webhook/download',
    deleteWebhook: 'http://localhost:5678/webhook/delete',
  };
}
