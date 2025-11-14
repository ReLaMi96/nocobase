# n8n Webhook Storage Plugin for NocoBase

This plugin provides a new storage engine for NocoBase that integrates with n8n webhooks for file operations.

## Features

- **Upload**: Send files to n8n via webhook for processing and storage
- **Download**: Retrieve files through n8n webhook endpoints  
- **Delete**: Remove files via n8n webhook (optional)
- **Configurable timeouts**: Set custom request timeouts for webhook calls

## Configuration

The storage engine can be configured with the following environment variables:

- `N8N_WEBHOOK_BASE_URL`: Base URL for your n8n instance (default: http://localhost:5678)
- `N8N_UPLOAD_WEBHOOK_URL`: n8n webhook URL for file uploads
- `N8N_DOWNLOAD_WEBHOOK_URL`: n8n webhook URL for file downloads (optional)
- `N8N_DELETE_WEBHOOK_URL`: n8n webhook URL for file deletions (optional)

## n8n Webhook Setup

### Upload Webhook

Your n8n upload webhook should:

1. Accept a multipart/form-data POST request
2. Process the uploaded file  
3. Store the file in your desired location
4. Return a JSON response with:
   ```json
   {
     "filename": "stored_filename.ext",
     "size": 12345,
     "url": "https://your-storage.com/path/to/file",
     "key": "unique_file_identifier"
   }
   ```

### Download Webhook (Optional)

Your n8n download webhook should:

1. Accept a JSON POST request with `filename` and `path`
2. Return a JSON response with:
   ```json
   {
     "url": "https://your-storage.com/path/to/file"
   }
   ```

### Delete Webhook (Optional)

Your n8n delete webhook should:

1. Accept a JSON POST request with `filename`, `path`, and `url`
2. Delete the file from your storage
3. Return success/error status

## Usage

1. Install and enable the plugin in NocoBase
2. Configure your n8n webhooks
3. Set the environment variables
4. Create a new storage in NocoBase admin interface:
   - Go to Settings > File Manager > Add New > n8n Webhook Storage
   - Configure the webhook URLs and timeout settings
5. The storage can now be used for file uploads in NocoBase

## Simple Initial Implementation

This is a basic implementation that:

- Sends files to n8n via webhook for upload processing
- Supports optional download and delete operations  
- Handles basic error scenarios
- Provides configurable timeout settings

The implementation can be extended to support more advanced features like:

- Chunked uploads for large files
- Progress reporting
- Advanced authentication
- Custom metadata handling
- Retry mechanisms
