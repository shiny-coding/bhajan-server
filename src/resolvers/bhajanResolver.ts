import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { SearchService } from '../services/searchService';
import { Bhajan } from '../models/Bhajan';
import { importBhajans } from "../services/xlsImporter";
import { hashToken } from "../utils/hash";

export const dynamo = new DynamoDB({
  region: "fakeRegion",
  endpoint: "http://localhost:8005",
});

export const TableName = "bhajans";

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
    createBhajan: async (_: any, { oldAuthor, oldTitle, ...bhajan }: { oldAuthor?: string, oldTitle?: string } & Bhajan) => {
      try {
        // If oldAuthor and oldTitle exist, delete the old record first
        if (oldAuthor && oldTitle) {
          try {
            await dynamo.deleteItem({
              TableName,
              Key: marshall({ author: oldAuthor, title: oldTitle })
            });
          } catch (error) {
            // Ignore deletion errors for non-existent items
            console.log(`Item not found in DynamoDB: ${oldAuthor} - ${oldTitle}`);
          }

          try {
            await SearchService.deleteItem(oldAuthor, oldTitle);
          } catch (error) {
            // Ignore deletion errors for non-existent items
            console.log(`Item not found in Search index: ${oldAuthor} - ${oldTitle}`);
          }
        }
        if ( bhajan.author.trim() == '' ) {
          bhajan.author = 'Unknown';
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