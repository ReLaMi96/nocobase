/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 */

import axios from 'axios';
import FormData from 'form-data';
import type { Readable } from 'stream';
import Path from 'path';
import { UserIdEncryption } from '../utils/encryption';

const STORAGE_TYPE_N8N_WEBHOOK = 'n8n-webhook';

// Define types needed for NocoBase storage
interface StorageModel {
  id?: number;
  title: string;
  type: string;
  name: string;
  baseUrl: string;
  options: Record<string, any>;
  rules?: Record<string, any>;
  path?: string;
  default?: boolean;
  paranoid?: boolean;
}

interface AttachmentModel {
  id?: number;
  title: string;
  filename: string;
  mimetype?: string;
  path: string;
  url?: string;
  storageId: number;
}

abstract class StorageType {
  static defaults(): StorageModel {
    return {} as StorageModel;
  }

  constructor(public storage: StorageModel) {}

  abstract make(): any;
  abstract delete(records: AttachmentModel[]): [number, AttachmentModel[]] | Promise<[number, AttachmentModel[]]>;

  getFileURL(file: AttachmentModel, preview?: boolean, ctx?: any): string | Promise<string> {
    // Base implementation for constructing file URLs
    const keys = [this.storage.baseUrl, file.path && encodeURI(file.path), encodeURIComponent(file.filename)].filter(
      Boolean,
    );
    return keys.join('/');
  }

  async getFileStream(file: AttachmentModel, ctx?: any): Promise<{ stream: Readable; contentType?: string }> {
    throw new Error('Not implemented');
  }
}

export default class N8nWebhookStorage extends StorageType {
  static defaults() {
    return {
      title: 'n8n Webhook Storage',
      type: STORAGE_TYPE_N8N_WEBHOOK,
      name: 'n8n-webhook-1',
      baseUrl: process.env.N8N_WEBHOOK_BASE_URL || 'http://localhost:5678',
      options: {
        uploadWebhookUrl: process.env.N8N_UPLOAD_WEBHOOK_URL || '',
        downloadWebhookUrl: process.env.N8N_DOWNLOAD_WEBHOOK_URL || '',
        deleteWebhookUrl: process.env.N8N_DELETE_WEBHOOK_URL || '',
        timeout: 30000, // 30 seconds timeout
      },
    };
  }

  make() {
    const storageInstance = this;

    return {
      _handleFile(req: any, file: any, cb: any) {
        const uploadToN8n = async () => {
          try {
            const formData = new FormData();

            // Ensure filename is properly handled as UTF-8
            // Convert to Buffer and back to ensure proper encoding
            const originalFilename = Buffer.from(file.originalname, 'latin1').toString('utf8');

            formData.append('file', file.stream, {
              filename: originalFilename,
              contentType: file.mimetype,
            });

            // Add additional metadata
            formData.append('originalname', originalFilename);
            formData.append('mimetype', file.mimetype || 'application/octet-stream');

            // Add file ID for database lookup instead of trying to get user ID directly
            let fileId = null;
            let correlationId = null;
            let userToken = null;
            let userId = null;

            console.log('Upload: Starting file ID and user extraction...');

            // Try to extract user session token or authentication info
            if (req && req.headers) {
              console.log('Upload: Checking authentication headers...');

              // Check Authorization header
              const authHeader = req.headers.authorization;
              if (authHeader) {
                userToken = authHeader;
                console.log('Upload: Found Authorization header:', authHeader.substring(0, 20) + '...');
              }

              const customHeaders = ['x-user-id', 'x-user-token', 'x-session-id', 'x-auth-token', 'x-api-key'];

              for (const headerName of customHeaders) {
                const headerValue = req.headers[headerName.toLowerCase()];
                if (headerValue) {
                  console.log(`Upload: Found ${headerName}:`, headerValue);
                  if (headerName === 'x-user-id') {
                    userId = headerValue;
                  } /*else if (!userToken) {
                    userToken = headerValue;
                  }*/
                }
              }

              // Log all headers for debugging (excluding potentially sensitive ones)
              console.log(
                'Upload: Available headers:',
                Object.keys(req.headers).filter((h) => !['authorization', 'cookie'].includes(h.toLowerCase())),
              );
            }

            // Try to get file ID from various sources
            if (file.id) {
              fileId = file.id;
              console.log('Upload: Found fileId from file.id:', fileId);
            } else if (file.fieldname) {
              // Sometimes the field name contains useful info
              console.log('Upload: File fieldname:', file.fieldname);
            }

            // Create a correlation ID based on filename and timestamp
            // This will help match the webhook call to the database record
            correlationId = `${originalFilename}-${Date.now()}`;
            console.log('Upload: Created correlationId:', correlationId);

            // Check if there's any ID in the request that we can use
            if (!fileId && req) {
              console.log('Upload: Checking request for ID information...');

              // Check URL parameters
              if (req.url) {
                try {
                  const url = new URL(req.url, 'http://localhost');
                  const urlParams = url.searchParams;
                  console.log('Upload: URL search params:', Object.fromEntries(urlParams.entries()));

                  // Look for attachment field or other identifiers
                  const attachmentField = urlParams.get('attachmentField');
                  if (attachmentField) {
                    console.log('Upload: Found attachmentField:', attachmentField);
                  }
                } catch (urlError) {
                  console.log('Upload: Could not parse URL');
                }
              }

              // Check request body for any IDs
              if (req.body) {
                console.log('Upload: Request body keys:', Object.keys(req.body));
                if (req.body.id) {
                  fileId = req.body.id;
                  console.log('Upload: Found fileId from req.body.id:', fileId);
                }
              }

              // Check request params
              if (req.params) {
                console.log('Upload: Request params:', req.params);
                if (req.params.id) {
                  fileId = req.params.id;
                  console.log('Upload: Found fileId from req.params.id:', fileId);
                }
              }

              // Check request query
              if (req.query) {
                console.log('Upload: Request query:', req.query);
                if (req.query.id) {
                  fileId = req.query.id;
                  console.log('Upload: Found fileId from req.query.id:', fileId);
                }
              }
            }

            console.log('Upload: Final extraction results:');
            console.log('  - fileId:', fileId);
            console.log('  - userId:', userId);
            console.log('  - userToken available:', !!userToken);

            // Send multiple identifiers to help with database lookup
            const fileIdToSend = fileId ? fileId.toString() : 'not-available';
            formData.append('fileId', fileIdToSend);
            formData.append('correlationId', correlationId); // filename + timestamp for correlation
            formData.append('originalFilename', originalFilename); // for filename-based lookup

            // Add user identification
            if (userId) {
              // Encrypt the user ID before sending
              const encryptedUserId = UserIdEncryption.encrypt(userId);
              formData.append('userId', encryptedUserId);

              // Add verification hash for additional security
              const verificationHash = UserIdEncryption.createHash(userId.toString() + correlationId);
              formData.append('userHash', verificationHash);

              console.log('Upload: Added encrypted userId to formData:', encryptedUserId.substring(0, 20) + '...');
            } else {
              formData.append('userId', 'lookup-via-token'); // Indicates to use token for user lookup
            }

            // Add user token for session-based user lookup
            if (userToken) {
              formData.append('userToken', userToken);
              console.log('Upload: Added userToken to formData (length):', userToken.length);
            }

            console.log('Upload: Added identifiers to formData:');
            console.log('  - fileId:', fileIdToSend);
            console.log('  - correlationId:', correlationId);
            console.log('  - originalFilename:', originalFilename);
            console.log(
              '  - userId:',
              userId ? 'encrypted-' + UserIdEncryption.encrypt(userId).substring(0, 16) + '...' : 'lookup-via-token',
            );
            console.log('  - userToken:', userToken ? 'present' : 'not-available');

            // Also add a timestamp for debugging
            formData.append('uploadTimestamp', new Date().toISOString());

            // Debug: Log all form data fields
            console.log('Upload: FormData fields being sent:');
            const formDataEntries = (formData as any)._streams;
            if (formDataEntries) {
              for (let i = 0; i < formDataEntries.length; i++) {
                if (typeof formDataEntries[i] === 'string') {
                  console.log('  Field:', formDataEntries[i]);
                }
              }
            }

            const response = await axios.post(storageInstance.storage.options.uploadWebhookUrl, formData, {
              headers: {
                ...formData.getHeaders(),
                // Explicitly set charset
                'Accept-Charset': 'utf-8',
              },
              timeout: storageInstance.storage.options.timeout,
              // Ensure axios handles the response as UTF-8
              responseEncoding: 'utf8',
            });

            if (response.status !== 200) {
              throw new Error(`Upload failed with status: ${response.status}`);
            }

            const result = response.data;

            // Ensure filename from response is also UTF-8
            const resultFilename = result.filename
              ? Buffer.from(result.filename, 'latin1').toString('utf8')
              : originalFilename;

            // Return file info expected by NocoBase
            cb(null, {
              filename: resultFilename,
              size: result.size || 0,
              mimetype: file.mimetype,
              url: result.url || '',
              key: result.key || resultFilename,
            });
          } catch (error) {
            cb(error);
          }
        };

        uploadToN8n();
      },

      _removeFile(req: any, file: any, cb: any) {
        // Called when upload fails, can be implemented if n8n needs cleanup
        cb(null);
      },
    };
  }

  async delete(records: AttachmentModel[]): Promise<[number, AttachmentModel[]]> {
    if (!this.storage.options.deleteWebhookUrl) {
      // If no delete webhook is configured, just return success
      return [records.length, []];
    }

    let deletedCount = 0;
    const failedRecords: AttachmentModel[] = [];

    for (const record of records) {
      try {
        await axios.post(
          this.storage.options.deleteWebhookUrl,
          {
            filename: record.filename,
            path: record.path,
            url: record.url,
          },
          {
            timeout: this.storage.options.timeout,
          },
        );

        deletedCount++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Failed to delete file via n8n webhook:', errorMessage);
        failedRecords.push(record);
      }
    }

    return [deletedCount, failedRecords];
  }

  async getFileStream(file: AttachmentModel, ctx?: any): Promise<{ stream: Readable; contentType?: string }> {
    try {
      const fileUrl = file.url;

      // If file has a direct HTTP URL, use it directly
      if (fileUrl && fileUrl.startsWith('http')) {
        console.log('Downloading file directly from URL:', fileUrl);
        const response = await axios.get(fileUrl, {
          responseType: 'stream',
          timeout: this.storage.options.timeout,
        });

        return {
          stream: response.data,
          contentType: response.headers['content-type'] || file.mimetype,
        };
      }

      // If no direct URL and download webhook is configured, use webhook with POST
      if (!fileUrl && this.storage.options.downloadWebhookUrl) {
        console.log('Getting file via n8n download webhook (POST):', this.storage.options.downloadWebhookUrl);

        // Try to get user ID from various possible locations
        let userId = null;

        // First, try to get from passed context parameter
        if (ctx && ctx.state && ctx.state.currentUser && ctx.state.currentUser.id) {
          userId = ctx.state.currentUser.id;
          console.log('Download: Found userId from passed context:', userId);
        }

        // If no context passed, try global context
        if (!userId) {
          try {
            const globalProcess = require('node:process');
            if (
              globalProcess._nocobaseCurrentContext &&
              globalProcess._nocobaseCurrentContext.state &&
              globalProcess._nocobaseCurrentContext.state.currentUser
            ) {
              userId = globalProcess._nocobaseCurrentContext.state.currentUser.id;
              console.log('Download: Found userId from global context:', userId);
            }
          } catch (error) {
            // Ignore global context errors
          }
        }

        // If still no user ID, try async local storage
        if (!userId) {
          try {
            const asyncLocalStorage = require('async_hooks').AsyncLocalStorage;
            const store = asyncLocalStorage?.getStore?.();
            if (store && store.ctx && store.ctx.state && store.ctx.state.currentUser) {
              userId = store.ctx.state.currentUser.id;
              console.log('Download: Found userId from async context:', userId);
            }
          } catch (error) {
            // Ignore async storage errors
          }
        }

        console.log('Download: Final userId for request:', userId);

        const requestData = {
          filename: file.filename,
          path: file.path,
          storageId: file.storageId,
          fileId: file.id || 'unknown', // Include file ID for database lookup
        };

        // Add user ID if available
        if (userId) {
          // Encrypt the user ID before sending in POST data
          const encryptedUserId = UserIdEncryption.encrypt(userId);
          (requestData as any).userId = encryptedUserId;

          // Add verification hash for additional security
          const verificationHash = UserIdEncryption.createHash(userId.toString() + (file.id || 'unknown'));
          (requestData as any).userHash = verificationHash;

          console.log('Download: Added encrypted userId to request data:', encryptedUserId.substring(0, 20) + '...');
        } else {
          (requestData as any).userId = 'lookup-via-fileId';
          console.log('Download: Will use fileId for user lookup');
        }

        const response = await axios.post(this.storage.options.downloadWebhookUrl, requestData, {
          responseType: 'stream',
          timeout: this.storage.options.timeout,
        });

        return {
          stream: response.data,
          contentType: response.headers['content-type'] || file.mimetype,
        };
      }

      throw new Error(
        'No download method available - please configure downloadWebhookUrl or ensure files have direct URLs',
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Failed to get file stream:', errorMessage);
      throw new Error(`Failed to get file stream: ${errorMessage}`);
    }
  }

  getFileURL(file: AttachmentModel, preview = false, ctx?: any): string | Promise<string> {
    // If file has a direct HTTP URL from n8n response, return it
    if (file.url && file.url.startsWith('http')) {
      return file.url;
    }

    // If no direct URL but we have download webhook configured,
    // return the webhook URL with filename as query parameter
    // This allows n8n to extract the filename from the GET request
    if (this.storage.options.downloadWebhookUrl) {
      const params = new URLSearchParams({
        filename: file.filename,
        path: file.path || '',
        storageId: file.storageId.toString(),
        fileId: file.id?.toString() || 'unknown', // Include file ID for database lookup
      });

      // Try to get current user ID for the download URL
      let urlUserId = null;

      // First, try to get from passed context parameter
      if (ctx && ctx.state && ctx.state.currentUser && ctx.state.currentUser.id) {
        urlUserId = ctx.state.currentUser.id;
        console.log('getFileURL: Found userId from passed context:', urlUserId);
      }

      // If no context passed or no user in context, try multiple approaches to get user ID
      if (!urlUserId) {
        // Try global context storage set by middleware
        try {
          const globalThis = require('node:process');
          if (
            globalThis._nocobaseCurrentContext &&
            globalThis._nocobaseCurrentContext.state &&
            globalThis._nocobaseCurrentContext.state.currentUser
          ) {
            urlUserId = globalThis._nocobaseCurrentContext.state.currentUser.id;
            console.log('getFileURL: Found userId from global context:', urlUserId);
          }
        } catch (error) {
          // Ignore global context errors
        }

        // Try async local storage
        if (!urlUserId) {
          try {
            const asyncLocalStorage = require('async_hooks').AsyncLocalStorage;
            const store = asyncLocalStorage?.getStore?.();
            if (store && store.ctx && store.ctx.state && store.ctx.state.currentUser) {
              urlUserId = store.ctx.state.currentUser.id;
              console.log('getFileURL: Found userId from async context:', urlUserId);
            }
          } catch (error) {
            // Ignore async storage errors
          }
        }
      }

      if (urlUserId) {
        // Encrypt the user ID with file ID binding and 15-minute expiration
        const encryptedUserId = UserIdEncryption.encrypt(urlUserId, file.id, 15);
        params.set('userId', encryptedUserId);

        console.log(
          'getFileURL: Added encrypted userId with expiration to URL params:',
          encryptedUserId.substring(0, 20) + '...',
        );
      } else {
        const encryptedUserId = UserIdEncryption.encrypt('lookup-via-field', file.id, 15);
        params.set('userId', encryptedUserId);
        console.log('getFileURL: Will use fileId for user lookup');
      }

      return `${this.storage.options.downloadWebhookUrl}?${params.toString()}`;
    }

    // Fallback: use base implementation (this will use baseUrl + path + filename)
    // This might not work for n8n but provides a fallback
    return super.getFileURL(file, preview);
  }

  getFileData(file: any, meta = {}) {
    // Extract filename from the file object (could be filename, key, or other property)
    const filename = file.filename || file.key || file.originalname;

    // Extract file extension
    const extname = filename ? filename.substring(filename.lastIndexOf('.')) : '';

    // Get the title (filename without extension)
    const title = filename ? filename.replace(extname, '') : 'untitled';

    const data = {
      title,
      filename,
      extname,
      path: this.storage.path || '',
      size: file.size || 0,
      mimetype: file.mimetype || 'application/octet-stream',
      url: file.url || '',
      meta,
      storageId: this.storage.id,
    };

    return data;
  }
}

export { STORAGE_TYPE_N8N_WEBHOOK };
