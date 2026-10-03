import { dialog } from 'electron';

import { statSync } from 'node:fs';

import path from 'node:path';

export type CampaignAttachmentType = 'image' | 'document';

export type CampaignAttachmentResult =
  | {
      canceled: true;
    }
  | {
      canceled: false;
      filePath: string;
      fileName: string;
      extension: string;
      sizeBytes: number;
    };

export async function chooseCampaignAttachment(
  type: CampaignAttachmentType,
): Promise<CampaignAttachmentResult> {
  const filters =
    type === 'image'
      ? [
          {
            name: 'Images',
            extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'],
          },
        ]
      : [
          {
            name: 'Documents',
            extensions: [
              'pdf',
              'doc',
              'docx',
              'xls',
              'xlsx',
              'ppt',
              'pptx',
              'txt',
              'csv',
              'zip',
            ],
          },
        ];

  const result = await dialog.showOpenDialog({
    title: type === 'image' ? 'Choose Image' : 'Choose Document',

    properties: ['openFile'],

    filters,
  });

  if (result.canceled || result.filePaths.length === 0) {
    return {
      canceled: true,
    };
  }

  const filePath = result.filePaths[0];

  const stats = statSync(filePath);

  return {
    canceled: false,

    filePath,

    fileName: path.basename(filePath),

    extension: path.extname(filePath).replace('.', '').toLowerCase(),

    sizeBytes: stats.size,
  };
}
