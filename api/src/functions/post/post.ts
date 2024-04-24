import type { APIGatewayEvent, Context } from 'aws-lambda'
import * as openpgp from 'openpgp'
import { db } from 'src/lib/db'
import type { Thread, CreateThreadInput } from 'api/types/graphql'

import { logger } from 'src/lib/logger'

/**
 * The handler function is your code that processes http request events.
 * You can use return and throw to send a response or error, respectively.
 *
 * Important: When deployed, a custom serverless function is an open API
 * endpoint and is your responsibility to secure appropriately.
 *
 * @see {@link
 *     https://redwoodjs.com/docs/serverless-functions#security-considerations|Serverless
 *     Function Considerations}
 * in the RedwoodJS documentation for more information.
 *
 * @typedef { import('aws-lambda').APIGatewayEvent } APIGatewayEvent
 * @typedef { import('aws-lambda').Context } Context
 * @param { APIGatewayEvent } event - an object which contains information from
 *     the invoker.
 * @param { Context } context - contains information about the invocation,
 * function, and execution environment.
 */

export const handler = async (event: APIGatewayEvent, _context: Context) => {
  const msg = await openpgp.readCleartextMessage({
    cleartextMessage: event.body,
  })

  const keyIds = msg.getSigningKeyIDs()

  const keys = await db.publicKey.findMany({
    where: {
      keyId: {
        in: keyIds.map((x) => x.toHex()),
      },
    },
    select: {
      armoredKey: true,
      revoked: true,
      approved: true,
    },
  })

  const signingKeys = await Promise.all(
    keys
      .filter((x) => !x.revoked)
      .map((key) =>
        openpgp.readKey({
          armoredKey: key.armoredKey,
        })
      )
  )

  if (signingKeys.length <= 0) {
    return {
      status: 401,
    }
  }

  const verifications = await msg.verify(signingKeys)

  if (!verifications.every((x) => x)) {
    return { status: 401 }
  }

  var armoredSignature: string
  {
    const clearLine = event.body.split('\n')
    var readingSignature = false

    clearLine.forEach((line) => {
      readingSignature =
        (readingSignature || line === '-----BEGIN PGP SIGNATURE-----') &&
        (!readingSignature || line === '-----END PGP SIGNATURE-----')

      if (readingSignature) {
        armoredSignature += line
      }
    })
  }

  const signature = await openpgp.readSignature({ armoredSignature })
  var timestamp: Date

  signature.packets.forEach((packet) => {
    if (packet.created > timestamp) {
      timestamp = packet.created
    }
  })

  const postContent = msg.getText()
  const lines = postContent.split('\n')

  var replyTo: string
  var hash: string

  var linePos = 0
  var lastKey = ''
  for (; linePos < lines.length; linePos++) {
    const [key, ...v] = lines[linePos].split('=')
    if (key == '') {
      linePos++
      break
    }

    const value = v.join('=')

    if (lastKey.localeCompare(key) != -1) {
      return { status: 400 }
    }

    switch (key) {
      case 'replyTo':
        const c = await db.thread.findFirst({
          where: {
            hash: value,
          },
        })
        if (!c) {
          return { status: 400 }
        }
        replyTo = value
        break
      case 'id':
        hash = value
        break
    }
  }

  const body = lines.slice(linePos).join('\n')

  const unhashedMessage = [hash, replyTo, "", body].join("\n")

  await db.thread.create({
    data: {
      body,
      replyTo,
      timestamp,
      signedById: keyIds[0].toHex(),
      signature: armoredSignature,
      hash,
    },
  })

  return {
    status: 301,
  }
}
