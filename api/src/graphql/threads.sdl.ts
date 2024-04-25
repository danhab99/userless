export const schema = gql`
  type Thread {
    approved: Boolean!
    body: String!
    hash: String!
    parent: Thread
    parents(limit: Int): [Thread]!
    replies(skip: Int, limit: Int): [Thread]!
    signature: String!
    timestamp: DateTime!
    signedBy: PublicKey!
    policy: String
  }

  type Query {
    threads(skip: Int, limit: Int): [Thread]! @skipAuth
    thread(threadHash: String!): Thread @skipAuth
  }

  input CreateThreadInput {
    clearText: String!
  }

  input UpdatePolicyInput {
    allowReplies: Boolean
    banned: Boolean
    addRequiredRecipients: [String!]
    removeRequiredRecipients: [String!]
  }

  type Mutation {
    createThread(input: CreateThreadInput!): Thread! @skipAuth
    updatePolicy(hashs: [String!]!, policy: String!): [Thread!]! @skipAuth
  }
`
