# Example n8n Workflows for NocoBase Storage Integration

## Upload Workflow

```json
{
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "nocobase/upload",
        "responseMode": "onReceived",
        "options": {}
      },
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [240, 300]
    },
    {
      "parameters": {
        "functionCode": "// Extract file from webhook request\nconst file = items[0].binary?.file;\nconst originalname = items[0].json?.originalname || 'unknown';\nconst mimetype = items[0].json?.mimetype || 'application/octet-stream';\n\nif (!file) {\n  throw new Error('No file received');\n}\n\n// Generate unique filename\nconst timestamp = Date.now();\nconst extension = originalname.split('.').pop() || '';\nconst filename = `${timestamp}_${originalname}`;\n\n// Here you would typically save the file to your storage\n// For this example, we'll just return the file info\n\nreturn {\n  json: {\n    filename,\n    size: file.fileSize || 0,\n    url: `https://your-storage.com/files/${filename}`,\n    key: filename,\n    originalname,\n    mimetype\n  }\n};"
      },
      "name": "Process Upload",
      "type": "n8n-nodes-base.function",
      "typeVersion": 1,
      "position": [460, 300]
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ $json }}"
      },
      "name": "Respond to Webhook",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1,
      "position": [680, 300]
    }
  ],
  "connections": {
    "Webhook": {
      "main": [
        [
          {
            "node": "Process Upload",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Process Upload": {
      "main": [
        [
          {
            "node": "Respond to Webhook",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  }
}
```

## Download Workflow

```json
{
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "nocobase/download",
        "responseMode": "onReceived",
        "options": {}
      },
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [240, 300]
    },
    {
      "parameters": {
        "functionCode": "// Extract file info from request\nconst filename = items[0].json?.filename;\nconst path = items[0].json?.path;\n\nif (!filename) {\n  throw new Error('No filename provided');\n}\n\n// Generate download URL\n// This would typically query your storage system\nconst url = `https://your-storage.com/files/${filename}`;\n\nreturn {\n  json: {\n    url\n  }\n};"
      },
      "name": "Generate Download URL",
      "type": "n8n-nodes-base.function",
      "typeVersion": 1,
      "position": [460, 300]
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ $json }}"
      },
      "name": "Respond to Webhook",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1,
      "position": [680, 300]
    }
  ],
  "connections": {
    "Webhook": {
      "main": [
        [
          {
            "node": "Generate Download URL",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Generate Download URL": {
      "main": [
        [
          {
            "node": "Respond to Webhook",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  }
}
```

## Delete Workflow

```json
{
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "nocobase/delete",
        "responseMode": "onReceived",
        "options": {}
      },
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [240, 300]
    },
    {
      "parameters": {
        "functionCode": "// Extract file info from request\nconst filename = items[0].json?.filename;\nconst path = items[0].json?.path;\nconst url = items[0].json?.url;\n\nif (!filename) {\n  throw new Error('No filename provided');\n}\n\n// Here you would typically delete the file from your storage\n// For this example, we'll just log the deletion\nconsole.log(`Deleting file: ${filename}`);\n\nreturn {\n  json: {\n    success: true,\n    message: `File ${filename} deleted successfully`\n  }\n};"
      },
      "name": "Delete File",
      "type": "n8n-nodes-base.function",
      "typeVersion": 1,
      "position": [460, 300]
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ $json }}"
      },
      "name": "Respond to Webhook",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1,
      "position": [680, 300]
    }
  ],
  "connections": {
    "Webhook": {
      "main": [
        [
          {
            "node": "Delete File",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Delete File": {
      "main": [
        [
          {
            "node": "Respond to Webhook",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  }
}
```

## Environment Configuration

Set these environment variables in your NocoBase instance:

```bash
N8N_WEBHOOK_BASE_URL=https://your-n8n-instance.com
N8N_UPLOAD_WEBHOOK_URL=https://your-n8n-instance.com/webhook/nocobase/upload
N8N_DOWNLOAD_WEBHOOK_URL=https://your-n8n-instance.com/webhook/nocobase/download
N8N_DELETE_WEBHOOK_URL=https://your-n8n-instance.com/webhook/nocobase/delete
```

## Advanced Integration Examples

### S3 Integration

You can enhance the n8n workflows to integrate with AWS S3 or other cloud storage:

1. Add AWS S3 nodes to actually store/retrieve files
2. Generate presigned URLs for secure access
3. Handle file metadata and versioning

### Database Logging

Add database nodes to log file operations:

1. Record upload metadata
2. Track download requests
3. Audit file deletions

### Authentication

Add authentication to your webhooks:

1. API key validation
2. JWT token verification
3. IP address filtering
