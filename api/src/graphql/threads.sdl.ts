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
  }

  type Query {
    threads: [Thread]! 
    thread(threadHash: String!): Thread 
  }

  input CreateThreadInput {
    # approved: Boolean!
    body: String!
    hash: String!
    replyTo: String
    signature: String!
    timestamp: DateTime!
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
    createThread(input: CreateThreadInput!): Thread! @requireAuth
    # updateThread(id: Int!, input: UpdateThreadInput!): Thread! @requireAuth
    # deleteThread(id: Int!): Thread! @requireAuth
  }
`
