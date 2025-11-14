/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 */

const NAMESPACE = 'file-manager';

const common = {
  title: {
    'x-component': 'CollectionField',
    'x-decorator': 'FormItem',
  },
  name: {
    'x-component': 'CollectionField',
    'x-decorator': 'FormItem',
    'x-disabled': '{{ !createOnly }}',
    required: true,
    default: '{{ useNewId("s_") }}',
    description:
      '{{t("Randomly generated and can be modified. Support letters, numbers and underscores, must start with an letter.")}}',
  },
  baseUrl: {
    'x-component': 'CollectionField',
    'x-decorator': 'FormItem',
    description: `{{t('Base URL for file access, could be your CDN base URL. For example: "https://cdn.nocobase.com".', { ns: "${NAMESPACE}" })}}`,
  },
  path: {
    'x-component': 'CollectionField',
    'x-decorator': 'FormItem',
    description: `{{t('Relative path the file will be saved to. Left blank as root path. The leading and trailing slashes "/" will be ignored. For example: "user/avatar".', { ns: "${NAMESPACE}" })}}`,
  },
  rules: {
    type: 'object',
    'x-component': 'fieldset',
    properties: {
      size: {
        type: 'number',
        title: `{{t("File size limit", { ns: "${NAMESPACE}" })}}`,
        description: `{{t("Minimum from 1 byte, maximum up to 1GB.", { ns: "${NAMESPACE}" })}}`,
        'x-decorator': 'FormItem',
        'x-component': 'FileSizeField',
        required: true,
        default: 2097152, // 2MB default
      },
      mimetype: {
        type: 'string',
        title: `{{t("File type (in MIME type format)", { ns: "${NAMESPACE}" })}}`,
        description: `{{t('Multi-types seperated with comma, for example: "image/*", "image/png", "image/*, application/pdf" etc.', { ns: "${NAMESPACE}" })}}`,
        'x-decorator': 'FormItem',
        'x-component': 'Input',
        'x-component-props': {
          placeholder: '*',
        },
      },
    },
  },
  default: {
    'x-component': 'CollectionField',
    'x-decorator': 'FormItem',
    'x-content': `{{t("Default storage", { ns: "${NAMESPACE}" })}}`,
  },
  paranoid: {
    'x-component': 'CollectionField',
    'x-decorator': 'FormItem',
    'x-content': `{{t("Keep file in storage when destroy the file record", { ns: "${NAMESPACE}" })}}`,
    description: `{{t("Files are only removed when their corresponding records in the file collection are deleted. If a record from another collection includes an associating field referencing the file collection, the file will not be deleted unless cascade deletion is enabled for that association.", { ns: "${NAMESPACE}" })}}`,
  },
};

export default {
  name: 'n8n-webhook',
  title: 'n8n Webhook Storage',
  fieldset: {
    title: common.title,
    name: common.name,
    baseUrl: common.baseUrl,
    options: {
      type: 'object',
      'x-component': 'Fieldset',
      'x-component-props': {
        legend: `{{t("Options", { ns: "${NAMESPACE}" })}}`,
      },
      properties: {
        uploadWebhookUrl: {
          title: `{{t("Upload Webhook URL", { ns: "${NAMESPACE}" })}}`,
          type: 'string',
          'x-decorator': 'FormItem',
          'x-component': 'Input',
          required: true,
          description: 'The n8n webhook URL for file uploads',
        },
        downloadWebhookUrl: {
          title: `{{t("Download Webhook URL", { ns: "${NAMESPACE}" })}}`,
          type: 'string',
          'x-decorator': 'FormItem',
          'x-component': 'Input',
          description: 'The n8n webhook URL for file downloads (optional)',
        },
        deleteWebhookUrl: {
          title: `{{t("Delete Webhook URL", { ns: "${NAMESPACE}" })}}`,
          type: 'string',
          'x-decorator': 'FormItem',
          'x-component': 'Input',
          description: 'The n8n webhook URL for file deletions (optional)',
        },
        timeout: {
          title: `{{t("Request Timeout (ms)", { ns: "${NAMESPACE}" })}}`,
          type: 'number',
          'x-decorator': 'FormItem',
          'x-component': 'InputNumber',
          default: 30000,
          description: 'Timeout for webhook requests in milliseconds',
        },
      },
    },
    path: common.path,
    rules: common.rules,
    default: common.default,
    paranoid: common.paranoid,
  },
};
