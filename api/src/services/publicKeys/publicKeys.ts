import type {
  QueryResolvers,
  MutationResolvers,
  PublicKeyRelationResolvers,
} from 'types/graphql'

import { db } from 'src/lib/db'

export const publicKeys: QueryResolvers['publicKeys'] = () => {
  return db.publicKey.findMany()
}

export const publicKey: QueryResolvers['publicKey'] = ({ id }) => {
  return db.publicKey.findUnique({
    where: { id },
  })
}

export const createPublicKey: MutationResolvers['createPublicKey'] = ({
  input,
}) => {
  return db.publicKey.create({
    data: input,
  })
}

export const updatePublicKey: MutationResolvers['updatePublicKey'] = ({
  id,
  input,
}) => {
  return db.publicKey.update({
    data: input,
    where: { id },
  })
}

export const deletePublicKey: MutationResolvers['deletePublicKey'] = ({
  id,
}) => {
  return db.publicKey.delete({
    where: { id },
  })
}

export const PublicKey: PublicKeyRelationResolvers = {
  threads: (_obj, { root }) => {
    return db.publicKey.findUnique({ where: { id: root?.id } }).threads()
  },
}
