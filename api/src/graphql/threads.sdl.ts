export const schema = gql`
  type Thread {
    approved: Boolean!
    body: String!
    hash: String!
    # id: Int!
    parent: Thread
    replies: [Thread]!
    # replyTo: String!
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
    # approved: Boolean!
    body: String!
    hash: String!
    replyTo: String
    signature: String!
    timestamp: DateTime!
  }

  # input UpdateThreadInput {
  #   # approved: Boolean
  #   # body: String
  #   # hash: String
  #   # replyTo: String
  #   # signature: String
  #   # timestamp: DateTime
  # }

  input UpdatePolicyInput {
    allowReplies: Boolean
    banned: Boolean
    addRequiredRecipients: [String!]
    removeRequiredRecipients: [String!]
  }

  type Mutation {
    createThread(input: CreateThreadInput!): Thread! @skipAuth
    updatePolicy(hashs: [String!]!, policy: String!): [Thread!]! @skipAuth
    # updateThread(id: Int!, input: UpdateThreadInput!): Thread! @requireAuth
    # deleteThread(id: Int!): Thread! @requireAuth
  }
`
