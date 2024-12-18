import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { SearchService } from '../services/searchService';
import { Bhajan } from '../models/Bhajan';
import { importBhajans } from "../services/xlsImporter";
import { hashToken } from "../utils/hash";
import { createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import path from 'path';
import { transliterate } from 'transliteration';
import { promises as fs } from 'fs';

export const dynamo = new DynamoDB({
  region: "fakeRegion",
  endpoint: "http://localhost:8005",
});

export const TableName = "bhajans";

function sanitizeFileName(text: string): string {
  return transliterate(text, { 
    unknown: '', // Remove truly unknown chars
    replace: [], // Don't replace anything specifically
    trim: true 
  }).replace(/[^a-zA-Z0-9]/g, '-');
}

function getAudioDir(): string {
  return path.join(process.cwd(), 'web', 'audio');
}

export const resolvers = {
  Query: {
    getBhajan: async (_: unknown, { author, title }: { author: string, title: string }) => {
      try {
        const result = await dynamo.getItem({
          TableName,
          Key: marshall({ author, title })
        });
        return result.Item ? unmarshall(result.Item) : null;
      } catch (error) {
        console.error('Error getting bhajan:', error);
        throw new Error('Failed to get bhajan');
      }
    },
    listBhajans: async () => {
      try {
        const result = await dynamo.scan({ TableName });
        return result.Items ? result.Items.map(item => unmarshall(item)) : [];
      } catch (error) {
        console.error('Error listing bhajans:', error);
        throw new Error('Failed to list bhajans');
      }
    },
    searchBhajans: async (_: unknown, { searchTerm }: { searchTerm: string }) => {
      try {
        return await SearchService.search(searchTerm);
      } catch (error) {
        console.error('Error searching bhajans:', error);
        throw new Error('Failed to search bhajans');
      }
    },
    checkWriteToken: async (_: unknown, { writeTokenHash }: { writeTokenHash: string }) => {
      try {
        const validToken = process.env.WRITE_TOKEN;
        const validHash = hashToken(validToken as string);
        return writeTokenHash === validHash;
      } catch (error) {
        console.error('Error checking write token:', error);
        return false;
      }
    },
  },
  Mutation: {
    createBhajan: async (_: any, { oldAuthor, oldTitle, audioFile, deleteAudio, ...bhajan }: { 
      oldAuthor?: string, 
      oldTitle?: string, 
      audioFile?: any,
      deleteAudio?: boolean 
    } & Bhajan) => {
      try {
        if (bhajan.author.trim() === '') {
          bhajan.author = 'Unknown';
        }

        // Handle audio deletion if requested
        if (deleteAudio) {
          bhajan.audioPath = '';
          // Try to delete the existing file if it exists
          if (oldAuthor && oldTitle) {
            const oldFileName = `${sanitizeFileName(oldTitle)}-${sanitizeFileName(oldAuthor)}`;
            const audioDir = getAudioDir();
            const files = await fs.readdir(audioDir);
            const oldFile = files.find(f => f.startsWith(oldFileName));
            
            if (oldFile) {
              try {
                await fs.unlink(path.join(audioDir, oldFile));
              } catch (error) {
                console.error('Error deleting audio file:', error);
              }
            }
          }
        } else {
          // Handle existing audio file renaming
          if (oldAuthor && oldTitle && (oldAuthor !== bhajan.author || oldTitle !== bhajan.title)) {
            const oldFileName = `${sanitizeFileName(oldTitle)}-${sanitizeFileName(oldAuthor)}`;
            const newFileName = `${sanitizeFileName(bhajan.title)}-${sanitizeFileName(bhajan.author)}`;
            
            // Try to find and rename any existing audio file
            const audioDir = getAudioDir();
            const files = await fs.readdir(audioDir);
            const oldFile = files.find(f => f.startsWith(oldFileName));
            
            if (oldFile) {
              const extension = path.extname(oldFile);
              const newFile = `${newFileName}${extension}`;
              await fs.rename(
                path.join(audioDir, oldFile),
                path.join(audioDir, newFile)
              );
              bhajan.audioPath = `/audio/${newFile}`;
            }
          }

          // Handle new file upload
          if (audioFile) {
            const { createReadStream, filename } = await audioFile;
            if ( filename ) {
              const extension = path.extname(filename);
              const audioFileName = `${sanitizeFileName(bhajan.title)}-${sanitizeFileName(bhajan.author)}${extension}`;
              
              await mkdir(getAudioDir(), { recursive: true });
              
              await new Promise((resolve, reject) => {
                createReadStream()
                  .pipe(createWriteStream(path.join(getAudioDir(), audioFileName)))
                  .on('finish', resolve)
                  .on('error', reject);
              });

              bhajan.audioPath = `/audio/${audioFileName}`;
            }
          }
        }

        const bhajanWithTimestamp = {
          ...bhajan,
          lastModified: Date.now()  // Add current timestamp
        };

        // Create new record
        await dynamo.putItem({
          TableName,
          Item: marshall(bhajanWithTimestamp, { removeUndefinedValues: true })
        });

        await SearchService.indexItem(bhajanWithTimestamp);
        return true;
      } catch (error) {
        console.error('Error creating/updating bhajan:', error);
        return false;
      }
    },
    reindexAll: async () => {
      try {
        await SearchService.reindexAll();
        return true;
      } catch (error) {
        console.error('Error reindexing:', error);
        throw new Error('Failed to reindex');
      }
    },
    // test comment
    importBhajansFromXls: async (_: any, { filePath }: { filePath: string }) => {
      try {
        const importedBhajans = await importBhajans();
        return importedBhajans;
      } catch (error) {
        console.error('Failed to import bhajans:', error);
        throw new Error('Failed to import bhajans from Excel file');
      }
    },
    deleteBhajan: async (_: unknown, { author, title }: { author: string, title: string }) => {
      try {
        // Delete from DynamoDB
        await dynamo.deleteItem({
          TableName,
          Key: marshall({ author, title })
        });

        // Delete from OpenSearch
        await SearchService.deleteItem(author, title);
        
        return true;
      } catch (error) {
        console.error('Error deleting bhajan:', error);
        throw new Error('Failed to delete bhajan');
      }
    },
  },
};