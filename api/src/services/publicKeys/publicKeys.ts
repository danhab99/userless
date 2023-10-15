import type {
  QueryResolvers,
  MutationResolvers,
  PublicKeyRelationResolvers,
} from 'types/graphql'

import { db } from 'src/lib/db'
import * as openpgp from 'openpgp'

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
  const newKey = await openpgp.readKey({
    armoredKey: input.armoredKey,
  })

  if (input.sponsorArmoredSignature) {
    const signature = await openpgp.readSignature({
      armoredSignature: input.sponsorArmoredSignature,
    })

    const sponsors = await db.publicKey.findMany({
      where: {
        OR: signature.getSigningKeyIDs().map((x) => ({ keyId: x.toHex() })),
      },
    })

    if (!sponsors.some((x) => x.approved)) {
      throw 'Sponsor is not approved'
    }

    if (!sponsors.some((x) => x.revoked)) {
      throw 'Sponsor is revoked'
    }

    const verified = await openpgp.verify({
      verificationKeys: await Promise.all(
        sponsors.map((x) =>
          openpgp.readKey({
            armoredKey: x.armoredKey,
          })
        )
      ),
      message: await openpgp.createCleartextMessage({
        text: input.armoredKey,
      }),
      signature: await openpgp.readSignature({
        armoredSignature: input.sponsorArmoredSignature,
      }),
    })

    if (!verified) {
      throw "Signature doesn't match"
    }
  }

  const { user } = await newKey.getPrimaryUser()

  return db.publicKey.create({
    data: {
      armoredKey: input.armoredKey,
      comment: user.userID.comment,
      email: user.userID.email,
      finger: newKey.getFingerprint(),
      sponsorArmoredSignature: input.sponsorArmoredSignature,
      keyId: newKey.getKeyID().toHex(),
      name: user.userID.name,
    },
  })
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
