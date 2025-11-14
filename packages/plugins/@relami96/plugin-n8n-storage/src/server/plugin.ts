/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 */

import { Plugin } from '@nocobase/server';
import N8nWebhookStorage from './storages/n8n-webhook';

export class PluginAttachmentDbServer extends Plugin {
  async afterAdd() {}

  async beforeLoad() {}

  async load() {
    // Get the file manager plugin to register our storage type
    const fileManagerPlugin = (this as any).pm.get('file-manager') as any;
    if (fileManagerPlugin && typeof fileManagerPlugin.registerStorageType === 'function') {
      // Register our n8n webhook storage type
      fileManagerPlugin.registerStorageType('n8n-webhook', N8nWebhookStorage);
      console.log('n8n Webhook Storage registered with file manager on server');
    } else {
      console.warn('File manager plugin not found or registerStorageType method not available');
    }

    // Add a middleware to store current context globally for our storage to access
    (this as any).app.resourcer.use(
      async (ctx: any, next: any) => {
        // Store context globally so our storage can access current user
        const globalProcess = require('node:process');
        globalProcess._nocobaseCurrentContext = ctx;

        try {
          await next();
        } finally {
          // Clean up after request
          delete globalProcess._nocobaseCurrentContext;
        }
      },
      { after: 'auth' },
    );
  }

  async afterLoad() {
    // Also try to register after all plugins are loaded, in case the file manager wasn't ready during load
    const fileManagerPlugin = (this as any).pm.get('file-manager') as any;
    if (fileManagerPlugin && typeof fileManagerPlugin.registerStorageType === 'function') {
      // Register our n8n webhook storage type
      fileManagerPlugin.registerStorageType('n8n-webhook', N8nWebhookStorage);
      console.log('n8n Webhook Storage registered with file manager on server (afterLoad)');
    }
  }

  async install() {}

  async afterEnable() {}

  async afterDisable() {}

  async remove() {}
}

export default PluginAttachmentDbServer;
