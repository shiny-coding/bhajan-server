import { gql } from 'graphql-tag';

export const typeDefs = gql`
  type Item {
    id: String!
    name: String!
    description: String
  }

  type Query {
    getItem(id: String!): Item
    listItems: [Item]
  }

  type Mutation {
    createItem(id: String!, name: String!, description: String): Item
  }
`;