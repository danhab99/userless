export const schema = gql`
  type PublicKey {
    approved: Boolean!
    armoredKey: String!
    comment: String!
    email: String!
    finger: String!
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
    armoredKey: String!
  }

  input UpdatePublicKeyInput {
    armoredKey: String
  }

  type Mutation {
    createPublicKey(input: CreatePublicKeyInput!): PublicKey! @skipAuth
    updatePublicKey(input: UpdatePublicKeyInput!): PublicKey! @skipAuth
  }
`
