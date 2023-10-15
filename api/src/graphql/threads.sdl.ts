export const schema = gql`
  type Thread {
    approved: Boolean!
    body: String!
    files: [File]!
    hash: String!
    # id: Int!
    parent: Thread
    replies: [Thread]!
    # replyTo: String!
    signature: String!
    timestamp: DateTime!
    signedBy: PublicKey!
  }

  type Query {
    threads: [Thread]! @skipAuth
    thread(threadHash: String!): Thread @skipAuth
  }

  input CreateThreadInput {
    # approved: Boolean!
    body: String!
    hash: String!
    replyTo: String
    signature: String!
    timestamp: DateTime!
    files: [CreateFileInput]
  }

  input UpdateThreadInput {
    approved: Boolean
    body: String
    hash: String
    replyTo: String
    signature: String
    timestamp: DateTime
  }

  type Mutation {
    createThread(input: CreateThreadInput!): Thread! @skipAuth
    # updateThread(id: Int!, input: UpdateThreadInput!): Thread! @requireAuth
    # deleteThread(id: Int!): Thread! @requireAuth
  }
`
