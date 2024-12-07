import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { typeDefs } from './schema/bhajanSchema';
import { resolvers } from './resolvers/bhajanResolver';
import { SearchService } from './services/searchService';
import { importBhajans } from './services/xlsImporter';

const server = new ApolloServer({ typeDefs, resolvers });

(async () => {
  await SearchService.initIndex();
  const { url } = await startStandaloneServer(server, { listen: { port: 4000 } });
  console.log(`🚀 Server ready at ${url}`);
})();
