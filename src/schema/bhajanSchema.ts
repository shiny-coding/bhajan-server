import { gql } from 'graphql-tag';

export const typeDefs = gql`
  scalar Upload

  type Bhajan {
    author: String!
    title: String!
    chords: String
    text: String
    translation: String
    options: String
    reviewPath: String
    lessons: String
    audioPath: String
    lastModified: Float
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
    checkWriteToken(writeTokenHash: String!): Boolean
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
      reviewPath: String
      lessons: String
      audioPath: String
      audioFile: Upload
      reviewFile: Upload
      deleteAudio: Boolean
      deleteReview: Boolean
    ): Boolean

    deleteBhajan(author: String!, title: String!): Boolean

    reindexAll: Boolean

    importBhajans(file: Upload!): ImportStats!
    exportBhajans: String

    deleteAllBhajans: Boolean!
  }

  type ImportStats {
    numberAdded: Int!
    numberReplaced: Int!
    numberSkipped: Int!
  }
`;