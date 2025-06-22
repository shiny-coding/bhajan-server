import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import express from 'express';
import cors from 'cors';
import { graphqlUploadExpress } from 'graphql-upload-minimal';
import { typeDefs } from './schema/bhajanSchema';
import { resolvers } from './resolvers/bhajanResolver';
import { SearchService } from './services/searchService';
import { authPlugin } from './plugins/authPlugin';
import { GraphQLUpload } from 'graphql-upload-minimal';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

const server = new ApolloServer({ 
  typeDefs, 
  resolvers: {
    Upload: GraphQLUpload,
    ...resolvers
  }, 
  plugins: [authPlugin] 
});

(async () => {
  await server.start();
  await SearchService.initIndex();

  // Serve static files from the 'web' directory under '/web'
  app.use('/web', express.static(path.join(__dirname, '../web')));

  // Apply CORS and GraphQL middleware under '/api'
  app.use(
    '/api',
    cors({
      origin: process.env.CLIENT_URL,
      credentials: true,
      methods: ['POST', 'GET', 'OPTIONS'],
      // allowedHeaders: ['Content-Type', 'write-token-hash']
    }),
    graphqlUploadExpress({
      maxFileSize: 500 * 1024 * 1024, // 500MB in bytes
      maxFiles: 10 // Allow up to 10 files per request
    }),  // Enable file uploads with 500MB limit
    express.json({ limit: '500mb' }),          // Parse JSON bodies with 500MB limit
    express.urlencoded({ limit: '500mb', extended: true }), // Handle URL-encoded data with 500MB limit
    expressMiddleware(server, {
      context: async ({ req }) => ({ req })
    })
  );

  app.listen(4000, () => {
    console.log(`🚀 Server ready at http://localhost:4000/api`);
  });
})();
