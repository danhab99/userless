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
    sponsor: PublicKey
    sponsoring: [PublicKey]!
  }

  type Query {
    publicKeys: [PublicKey]!
    publicKey(keyId: String!): PublicKey 
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
    sponsorArmoredSignature String
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
    createPublicKey(input: CreatePublicKeyInput!): PublicKey! @requireAuth
    updatePublicKey(input: UpdatePublicKeyInput!): PublicKey!
      @requireAuth
    # deletePublicKey(keyId: String!): PublicKey! @requireAuth
  }
`
