import * as openpgp from 'openpgp'
import { db } from 'src/lib/db'
import type { Thread, PublicKey } from 'api/types/graphql'
import { createHash } from 'crypto'

class PGChanError extends Error {
  constructor(msg: string) {
    super(msg)
    Object.setPrototypeOf(this, PGChanError.prototype)
  }
}

function spoofArmoredSignature(clearText: string) {
  const clearLine = clearText.split('\n')
  var armoredSignature = ''
  var seenStart = false
  var seenEnd = false

  clearLine.forEach((line) => {
    seenStart = seenStart || line === '-----BEGIN PGP SIGNATURE-----'
    seenEnd = seenEnd || line === '-----END PGP SIGNATURE-----'

    if (seenStart && !seenEnd) {
      armoredSignature += line + '\n'
    }
  })

  armoredSignature += '-----END PGP SIGNATURE-----'

  return armoredSignature
}

async function getSigner(msg: openpgp.CleartextMessage): Promise<PublicKey> {
  const keyIds = msg.getSigningKeyIDs()
  if (keyIds.length <= 0) {
    throw new PGChanError('missing signatures')
  }

  const ownerKeyId = keyIds[0]

  const x = await db.publicKey.findFirst({
    where: {
      keyId: ownerKeyId.toHex(),
      revoked: false,
    },
  })

  if (!x) {
    throw new PGChanError('Nobody signed this')
  }

  return x as unknown as PublicKey
}

export type Policy = {
  allowReplies: boolean
  banned: boolean
  requireRecipients: string[]
}

// export async function collectPolicies(thread: Thread) {
//   const ancestors = await findAncestors(thread)
//   var policy: Policy = {
//     allowReplies: true,
//     banned: false,
//     requireRecipients: [],
//   }

//   for (const ancestor of ancestors) {
//     const msg = await openpgp.readCleartextMessage({
//       cleartextMessage: ancestor.policy,
//     })
//     await getSigner(msg)

//     const p: Policy = JSON.parse(msg.getText())

//     policy.allowReplies = !policy.allowReplies || p.allowReplies
//     policy.banned = policy.banned || p.banned
//     policy.requireRecipients = policy.requireRecipients.concat(
//       p.requireRecipients
//     )
//   }

//   return policy
// }

// export async function setPolicy(
//   thread: Pick<Thread, 'hash'>,
//   policyCleartext: string
// ) {
//   const msg = await openpgp.readCleartextMessage({
//     cleartextMessage: policyCleartext,
//   })

//   const owner = await getSigner(msg)
//   if (!owner.master) {
//     throw new PGChanError('Not allowed to change policy')
//   }

//   const rawSig = spoofArmoredSignature(policyCleartext)
//   const sig = await openpgp.readSignature({ armoredSignature: rawSig })

//   return db.thread.upsert({
//     create: {
//       body: '',
//       timestamp: sig.packets[0].created,
//       hash: thread.hash,
//     },
//     update: {
//       policy: policyCleartext,
//     },
//     where: {
//       hash: thread.hash,
//     },
//   })
// }

export async function findAncestors(
  start: Pick<Thread, 'hash'>,
  limit?: number
) {
  const startThread = await db.thread
    .findUnique({
      where: {
        hash: start.hash,
      },
    })
    .parent()

  if (!startThread) {
    return [];
  }

  const ancestors = [startThread]
  debugger

  var max = limit ?? Number.MAX_VALUE

  while (max-- > 0 && ancestors[ancestors.length - 1]?.replyTo) {
    const thread = await db.thread.findFirst({
      where: {
        hash: ancestors[ancestors.length - 1].replyTo,
      },
      include: {
        parent: true,
      },
    })
    ancestors.push(thread)
  }

  return ancestors
}

// export function compileClearTextMessage(thread: Thread): string {
//   return `-----BEGIN PGP SIGNED MESSAGE-----
// Hash: SHA256${thread.parent ? `\nreplyTo:${thread.parent.hash}` : ''}

// ${thread.body}
// -----BEGIN PGP SIGNATURE-----

// ${thread.signature}
// -----END PGP SIGNATURE-----
// `
// }

export async function uploadThread(threadClearText: string) {
  const msg = await openpgp.readCleartextMessage({
    cleartextMessage: threadClearText,
  })

  const ownerKeyDb = await getSigner(msg)

  if (!ownerKeyDb) {
    throw new PGChanError('cannot find owner key')
  }

  const ownerKey = await openpgp.readKey({
    armoredKey: ownerKeyDb.armoredKey,
  })

  const verifications = await msg.verify([ownerKey])

  if (!(await verifications[0].verified)) {
    throw new PGChanError('unable to verify signature')
  }

  var armoredSignature: string = spoofArmoredSignature(threadClearText)

  const signature = await openpgp.readSignature({ armoredSignature })
  var timestamp: Date = signature.packets[0].created

  var postContent = msg.getText()
  const lines = postContent.split('\n')

  var replyTo: string | undefined

  if (lines[0].startsWith('replyTo:')) {
    replyTo = lines[0].split(':')[1].trim()
    postContent = lines.slice(1).join('\n')
  }

  const hasher = createHash('sha256')
  hasher.write(threadClearText)
  const hash = hasher.digest().toString('hex')

  return db.thread.create({
    data: {
      body: threadClearText,
      hash: hash,
      timestamp: timestamp,
      replyTo: replyTo,
      signedById: signature.getSigningKeyIDs()[0].toHex(),
      policy: {
        acceptsReplies: true,
        visible: true,
        encryptFor: [],
        policyEditors: [],
      },
    },
  })
}

export async function registerPublicKey(publicKeyArmored: string) {
  const newKey = await openpgp.readKey({
    armoredKey: publicKeyArmored,
  })
  const { user } = await newKey.getPrimaryUser()

  return db.publicKey.create({
    data: {
      armoredKey: publicKeyArmored,
      comment: user.userID.comment,
      email: user.userID.email,
      finger: newKey.getFingerprint(),
      keyId: newKey.getKeyID().toHex(),
      name: user.userID.name,
      policy: {
        allowedToPost: true,
        canStartThreads: true,
        isMaster: true,
      },
    },
  })
}
