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
    audioPath: String
  }

  type SearchResult {
    bhajan: Bhajan!
    score: Float
    highlight: Bhajan!
  }

  type Query {
    getBhajan(author: String!, title: String!): Bhajan
    listBhajans: [Bhajan]
    searchBhajans(searchTerm: String!): [SearchResult]
  }

  type Mutation {
    createBhajan(
      oldAuthor: String
      oldTitle: String
      author: String!
      title: String!
      chords: String
      text: String
      translation: String
      options: String
      review: String
      lessons: String
      audioPath: String
    ): Boolean

    deleteBhajan(author: String!, title: String!): Boolean

    reindexAll: Boolean

    importBhajansFromXls: [Bhajan!]!
  }
`;