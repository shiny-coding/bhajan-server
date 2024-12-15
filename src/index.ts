import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { typeDefs } from './schema/bhajanSchema';
import { resolvers } from './resolvers/bhajanResolver';
import { SearchService } from './services/searchService';
import { authPlugin } from './plugins/authPlugin';
import { IncomingMessage } from 'http';

import dotenv from 'dotenv';
dotenv.config();
const validToken = process.env.WRITE_TOKEN;
if (!validToken) {
  throw new Error('WRITE_TOKEN not configured');
}

interface MyContext {
  req: IncomingMessage;
}

const server = new ApolloServer<MyContext>({ typeDefs, resolvers, plugins: [authPlugin] });

(async () => {
  await SearchService.initIndex();
  const { url } = await startStandaloneServer(server, {
    listen: { port: 4000 },
    context: async ({ req }) => ({ req })
  });
  console.log(`🚀 Server ready at ${url}`);
})();
