import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";

const dynamo = new DynamoDB({
	region: "fakeRegion",
	endpoint: "http://localhost:8005", // DynamoDB Local endpoint
	// accessKeyId: "fakeMyKeyId",
	// secretAccessKey: "fakeSecretAccessKey",
});

const TableName = "bhajans";

export const resolvers = {
  Query: {
    getItem: async (_: any, { id }: { id: string }) => {
      const result = await dynamo.getItem({
        TableName,
        Key: { id: { S: id } },
      });
      return result.Item ? unmarshall(result.Item) : null;
    },
    listItems: async () => {
      const result = await dynamo.scan({ TableName });
      return result.Items ? result.Items.map((item) => unmarshall(item)) : [];
    },
  },
  Mutation: {
    createItem: async (
      _: any,
      { id, name, description }: { id: string; name: string; description?: string }
    ) => {
      const item = { id, name, description };
      await dynamo.putItem({
        TableName,
        Item: {
          id: { S: id },
          name: { S: name },
          description: { S: description || "" },
        },
      });
      return item;
    },
  },
};
