import * as XLSX from 'xlsx';
import { dynamo, TableName } from '../resolvers/bhajanResolver';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import path from 'path';
import { promises as fs } from 'fs';

export async function exportBhajans(): Promise<string> {
  try {
    const result = await dynamo.scan({ TableName });
    if (!result.Items) throw new Error('No items found');

    const bhajans = result.Items.map(item => unmarshall(item));
    
    const worksheet = XLSX.utils.json_to_sheet(bhajans.map(bhajan => ({
      author: bhajan.author || '',
      title: bhajan.title || '',
      chords: bhajan.chords || '',
      text: bhajan.text || '',
      translation: bhajan.translation || '',
      options: bhajan.options || '',
      reviewPath: bhajan.reviewPath || '',
      lessons: bhajan.lessons || '',
      audioPath: bhajan.audioPath || ''
    })));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Bhajans');

    const exportDir = path.join(process.cwd(), 'web', 'exports');
    await fs.mkdir(exportDir, { recursive: true });
    
    const filename = `bhajans_export_${Date.now()}.xlsx`;
    const filePath = path.join(exportDir, filename);
    
    XLSX.writeFile(workbook, filePath);
    
    return `/exports/${filename}`;
  } catch (error) {
    console.error('Error exporting bhajans:', error);
    throw error;
  }
} 