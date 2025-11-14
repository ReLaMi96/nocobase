/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 */

import { Plugin } from '@nocobase/client';
import n8nWebhookStorageType from './schemas/storageTypes/n8n-webhook';

export class PluginAttachmentDbClient extends Plugin {
  async afterAdd() {
    console.log('PluginAttachmentDbClient: afterAdd called');
  }

  async beforeLoad() {
    console.log('PluginAttachmentDbClient: beforeLoad called');
  }

  async load() {
    console.log('PluginAttachmentDbClient: load called');
    // Try to register immediately
    this.registerWithFileManager();
  }

  async afterLoad() {
    console.log('PluginAttachmentDbClient: afterLoad called');
    // Also try after all plugins are loaded
    this.registerWithFileManager();
  }

  private registerWithFileManager() {
    try {
      // Get the file manager plugin by its exact name
      const fileManagerPlugin = this.app.pm.get('file-manager');
      console.log('File manager plugin found:', fileManagerPlugin);

      if (fileManagerPlugin && typeof (fileManagerPlugin as any).registerStorageType === 'function') {
        (fileManagerPlugin as any).registerStorageType('n8n-webhook', n8nWebhookStorageType);
        console.log('✅ n8n Webhook Storage plugin registered with file manager');
      } else {
        console.warn('❌ File manager plugin not found or registerStorageType method not available');
        console.log('Plugin manager available plugins:', Object.keys(this.app.pm));
      }
    } catch (error) {
      console.error('Error registering n8n webhook storage:', error);
    }
  }
}

export default PluginAttachmentDbClient;
