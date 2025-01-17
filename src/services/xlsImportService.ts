import * as XLSX from 'xlsx';
import { Bhajan } from '../models/Bhajan';
import { dynamo, TableName } from '../resolvers/bhajanResolver';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { SearchService } from './searchService';
import { keys } from 'ts-transformer-keys';

interface ImportStats {
  numberAdded: number;
  numberReplaced: number;
  numberSkipped: number;
}

export async function importBhajans(file?: any): Promise<ImportStats> {
  try {
    let workbook: XLSX.WorkBook;
    const stats: ImportStats = {
      numberAdded: 0,
      numberReplaced: 0,
      numberSkipped: 0
    };
    
    if (!file) {
      throw new Error('No file provided');
    }
    
    const { createReadStream } = await file;
    const stream = createReadStream();
    const chunks: any[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    workbook = XLSX.read(buffer, { type: 'buffer' });
    
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Get headers and convert to lowercase
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    const headers: string[] = [];
    
    // Validate headers against Bhajan fields
    const bhajanFields = new Set(keys<Bhajan>());
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cell = worksheet[XLSX.utils.encode_cell({ r: range.s.r, c: C })];
      if (!cell) continue;  
      
      const header = cell.v.toString().replace(/(?:^\w|[A-Z]|\b\w)/g, (letter: string, index: number) => 
        index === 0 ? letter.toLowerCase() : letter.toUpperCase()
      ).replace(/\s+/g, '');
      
      if (!bhajanFields.has(header)) {
        console.warn(`Ignoring unknown column: ${header}`);
      } else {
        headers[C] = header;
      }
    }
    
    // Convert to JSON and filter out invalid fields
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: headers });
    
    // Instead of collecting bhajans, just process them
    for (let i=0; i<rows.length; i++) {
      const row = rows[i];
      if (i == 0) continue; // skip header row
      
      const bhajan: Bhajan = {} as Bhajan;
      
      for (const [key, value] of Object.entries(row as Record<string, unknown>)) {
        if (bhajanFields.has(key as keyof Bhajan)) {
          const bhajanTyped = bhajan as Record<string, unknown>;
          bhajanTyped[key] = value?.toString() || '';
        }
      }

      if (!bhajan.author) bhajan.author = 'Unknown';
      
      // Check if bhajan exists
      const existingItem = await dynamo.getItem({
        TableName,
        Key: marshall({ author: bhajan.author, title: bhajan.title })
      });

      if (existingItem.Item) {
        const existing = unmarshall(existingItem.Item) as Bhajan;
        // Compare without lastModified and sort fields
        const { lastModified: _, ...existingWithoutTime } = existing;
        const { lastModified: __, ...bhajanWithoutTime } = bhajan;

        const stringifiedExisting = JSON.stringify(existingWithoutTime, Object.keys(existingWithoutTime).sort());
        const stringifiedBhajan = JSON.stringify(bhajanWithoutTime, Object.keys(bhajanWithoutTime).sort());
        
        if (stringifiedExisting === stringifiedBhajan) {
          stats.numberSkipped++;
          continue;
        }
        stats.numberReplaced++;
      } else {
        stats.numberAdded++;
      }

      await dynamo.putItem({
        TableName,
        Item: marshall(bhajan, { removeUndefinedValues: true })
      });
      
      await SearchService.indexItem(bhajan);
    }
    
    return stats;
  } catch (error) {
    console.error('Error importing bhajans:', error);
    throw error;
  }
} 