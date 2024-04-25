import type {
  QueryResolvers,
  MutationResolvers,
  PublicKeyRelationResolvers,
} from 'types/graphql'

import { db } from 'src/lib/db'
import * as openpgp from 'openpgp'
import {registerPublicKey} from 'src/lib/pgchan'

export const publicKeys: QueryResolvers['publicKeys'] = ({ keyIds }) => {
  if (keyIds) {
    return db.publicKey.findMany()
  } else
    db.publicKey.findMany({
      where: {
        OR: keyIds.map((keyId) => ({ keyId })),
      },
    })
}

export const publicKey: QueryResolvers['publicKey'] = ({ keyId }) => {
  return db.publicKey.findUnique({
    where: { keyId },
  })
}

export const createPublicKey: MutationResolvers['createPublicKey'] = async ({
  input,
}) => {
  return registerPublicKey(input.armoredKey)
}

export const updatePublicKey: MutationResolvers['updatePublicKey'] = async ({
  input,
}) => {
  const key = await openpgp.readKey({
    armoredKey: input.armoredKey,
  })
  return db.publicKey.update({
    data: {
      armoredKey: input.armoredKey,
      revoked: await key.isRevoked(),
    },
    where: {
      keyId: key.getKeyID().toHex(),
    },
  })
}

// export const deletePublicKey: MutationResolvers['deletePublicKey'] = ({
//   id,
// }) => {
//   return db.publicKey.delete({
//     where: { id },
//   })
// }

export const PublicKey: PublicKeyRelationResolvers = {
  threads: (_obj, { root }) => {
    return db.publicKey.findUnique({ where: { keyId: root.keyId } }).threads()
  },
}
