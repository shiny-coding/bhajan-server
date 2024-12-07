import { gql } from 'graphql-tag';

export const typeDefs = gql`
  type Bhajan {
    author: String!
    title: String!
    chords: String
    text: String
    translation: String
    options: String
    review: String
    lessons: String
  }

  type SearchResult {
    bhajan: Bhajan!
    score: Float
    highlight: Bhajan
  }

  type Query {
    getBhajan(author: String!, title: String!): Bhajan
    listBhajans: [Bhajan]
    searchBhajans(searchTerm: String!): [SearchResult]
  }

  type Mutation {
    createBhajan(
      author: String!
      title: String!
      chords: String
      text: String
      translation: String
      options: String
      review: String
      lessons: String
    ): Bhajan

    reindexAll: Boolean

    importBhajansFromXls: [Bhajan!]!
  }
`;