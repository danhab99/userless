export const schema = gql`
  type File {
    hash: String!
    # id: Int!
    mimeType: String!
    thread: Thread!
    # threadId: Int!
    url: String!
  }

  type Query {
    # files: [File!]! @requireAuth
    # file(id: Int!): File @requireAuth
  }

  input CreateFileInput {
    hash: String!
    mimeType: String!
    threadHash: String!
    url: String!
  }

  input UpdateFileInput {
    hash: String
    mimeType: String
    threadId: Int
    url: String
  }

  type Mutation {
    createFile(input: CreateFileInput!): File! @requireAuth
    # updateFile(id: Int!, input: UpdateFileInput!): File! @requireAuth
    # deleteFile(id: Int!): File! @requireAuth
  }
`
