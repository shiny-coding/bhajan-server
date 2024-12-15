import { ApolloServerPlugin, GraphQLRequestListener } from '@apollo/server';
import { GraphQLError } from 'graphql';
import { hashToken } from '../utils/hash';

export const authPlugin: ApolloServerPlugin = {
  async requestDidStart(): Promise<GraphQLRequestListener<any>> {
    return {
      async didResolveOperation({ operation, request, contextValue }) {
        if (operation?.operation === 'mutation') {
          const validToken = process.env.WRITE_TOKEN;
          const writeTokenHash = contextValue.req.headers['write-token-hash'] as string;
          
          if (!writeTokenHash) {
            throw new GraphQLError('Write token hash is required', {
              extensions: { code: 'UNAUTHORIZED' }
            });
          }
          
          if (writeTokenHash !== hashToken(validToken as string) && writeTokenHash != validToken) {
            throw new GraphQLError('Invalid write token hash', {
              extensions: { code: 'UNAUTHORIZED' }
            });
          }
        }
      }
    };
  }
}; 