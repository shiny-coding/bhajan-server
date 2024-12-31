import * as XLSX from 'xlsx';
import { Bhajan } from '../models/Bhajan';
import { dynamo, TableName } from '../resolvers/bhajanResolver';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { SearchService } from './searchService';
import { keys } from 'ts-transformer-keys';

async function clearDatabase() {
  const scanResult = await dynamo.scan({ TableName });
  
  if (scanResult.Items) {
    for (const item of scanResult.Items) {
      const unmarshalled = unmarshall(item);
      await dynamo.deleteItem({
        TableName,
        Key: marshall({
          author: unmarshalled.author,
          title: unmarshalled.title
        })
      });
    }
  }
  
  await SearchService.reindexAll();
}

export async function importBhajans(): Promise<Bhajan[]> {
  
  const workbook = XLSX.readFile('web/bhajans.xlsx');
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
  const importedBhajans: Bhajan[] = [];
  
  for (let i=0; i<rows.length; i++) {
    const row = rows[i];
    if (i == 0) continue; // skip header row
    
    const bhajan: Bhajan = {} as Bhajan;
    
    // Only copy valid fields
    for (const [key, value] of Object.entries(row as Record<string, unknown>)) {
      if (bhajanFields.has(key as keyof Bhajan)) {
        const bhajanTyped = bhajan as Record<string, unknown>;
        bhajanTyped[key] = value?.toString() || '';
      }
    }

    if ( !bhajan.author ) bhajan.author = 'Unknown';
    
    try {
      await dynamo.putItem({
        TableName,
        Item: marshall(bhajan, { removeUndefinedValues: true })
      });
      
      await SearchService.indexItem(bhajan);
    } catch (error) {
      console.error(`Error importing bhajan: ${bhajan.title}` );
      throw error;
    }
    
    importedBhajans.push(bhajan as Bhajan);
  }
  
  return importedBhajans;
}
