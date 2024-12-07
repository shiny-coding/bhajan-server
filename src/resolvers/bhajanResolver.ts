import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { SearchService } from '../services/searchService';
import { Bhajan } from '../models/Bhajan';
import { importBhajans } from "../services/xlsImporter";

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
  },
  Mutation: {
    createBhajan: async (_: any, bhajan: Bhajan ) => {
      await dynamo.putItem({
        TableName,
        Item: marshall(bhajan, { removeUndefinedValues: true })
      });

      await SearchService.indexItem(bhajan);
      return bhajan;
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
    importBhajansFromXls: async (_: any, { filePath }: { filePath: string }) => {
      try {
        const importedBhajans = await importBhajans();
        return importedBhajans;
      } catch (error) {
        console.error('Failed to import bhajans:', error);
        throw new Error('Failed to import bhajans from Excel file');
      }
    }
  },
};