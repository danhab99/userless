import type {
  QueryResolvers,
  MutationResolvers,
  ThreadRelationResolvers,
} from 'types/graphql'

import { db } from 'src/lib/db'
import * as openpgp from 'openpgp'

export const threads: QueryResolvers['threads'] = () => {
  return db.thread.findMany()
}

export const thread: QueryResolvers['thread'] = ({ threadHash }) => {
  return db.thread.findUnique({
    where: { hash: threadHash },
  })
}

export const createThread: MutationResolvers['createThread'] = async ({
  input,
}) => {
  const sig = await openpgp.readSignature({
    armoredSignature: input.signature,
  })

  const pubKeys = await db.publicKey.findMany({
    where: {
      OR: sig.getSigningKeyIDs().map((x) => ({ keyId: x.toHex() })),
    },
  })

  if (!pubKeys.every((x) => x.approved)) {
    throw 'Signatore not approved'
  }

  if (!pubKeys.every((x) => x.revoked)) {
    throw 'Signatore is revoked'
  }

  const verify = await openpgp.verify({
    message: await openpgp.createCleartextMessage({
      text: input.hash,
    }),
    verificationKeys: await Promise.all(
      pubKeys.map((x) =>
        openpgp.readKey({
          armoredKey: x.armoredKey,
        })
      )
    ),
  })

  if (!(await Promise.all(verify.signatures.map((x) => x.verified)))) {
    throw "Signature doesn't match thread"
  }

  return db.thread.create({
    data: {
      hash: input.hash,
      body: input.body,
      signature: input.signature,
      timestamp: input.timestamp,
      signedById: pubKeys[0].keyId,
      ...(input.replyTo ? { parent: input.replyTo } : {}),
      files: {
        createMany: {
          data: input.files,
        },
      },
    },
  })
}

// export const updateThread: MutationResolvers['updateThread'] = ({
//   id,
//   input,
// }) => {
//   return db.thread.update({
//     data: input,
//     where: { id },
//   })
// }

// export const deleteThread: MutationResolvers['deleteThread'] = ({ id }) => {
//   return db.thread.delete({
//     where: { id },
//   })
// }

export const Thread: ThreadRelationResolvers = {
  files: (_obj, { root }) => {
    return db.thread.findUnique({ where: { hash: root.hash } }).files()
  },
  parent: (_obj, { root }) => {
    return db.thread.findUnique({ where: { hash: root.hash } }).parent()
  },
  replies: (_obj, { root }) => {
    return db.thread.findUnique({ where: { hash: root.hash } }).replies()
  },
}
