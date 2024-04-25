export const schema = gql`
  type PublicKey {
    approved: Boolean!
    armoredKey: String!
    comment: String!
    email: String!
    finger: String!
    # id: Int!
    keyId: String!
    master: Boolean!
    name: String!
    revoked: Boolean!
    threads: [Thread]!
  }

  type Query {
    publicKeys(keyIds: [String!]): [PublicKey]! @skipAuth
    publicKey(keyId: String!): PublicKey @skipAuth
  }

  input CreatePublicKeyInput {
    # approved: Boolean!
    armoredKey: String!
    # comment: String!
    # email: String!
    # finger: String!
    # keyId: String!
    # master: Boolean
    # name: String!
    # revoked: Boolean
  }

  input UpdatePublicKeyInput {
    # approved: Boolean
    armoredKey: String
    # comment: String
    # email: String
    # finger: String
    # keyId: String
    # master: Boolean
    # name: String
    # revoked: Boolean
  }

  type Mutation {
    createPublicKey(input: CreatePublicKeyInput!): PublicKey! @skipAuth
    updatePublicKey(input: UpdatePublicKeyInput!): PublicKey!
      @skipAuth
    # deletePublicKey(keyId: String!): PublicKey! @requireAuth
  }
`
