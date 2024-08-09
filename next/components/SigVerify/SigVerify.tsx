import * as openpgp from 'openpgp'
import { useEffect, useState } from 'react'
import { PublicKey, Thread } from 'types/graphql'
import { useApolloClient } from '@apollo/client'

const GET_PUBLICKEY = gql`
  query GetPublicArmoredKey($keyId: [String!]) {
    publicKeys(keyIds: $keyId) {
      armoredKey
    }
  }
`

type SigVerifyProps = {
  thread: Thread
}

enum VerifiedStatus {
  Working,
  Success,
  NoMatch,
  Error,
  Revoked,
}

const SigVerify = (props: SigVerifyProps) => {
  const [status, setStatus] = useState<VerifiedStatus>(VerifiedStatus.Working)

  const client = useApolloClient()

  useEffect(() => {
    if (props.thread) {
      setStatus(VerifiedStatus.Working)
      ;(async () => {
        const msg = await openpgp.readCleartextMessage({
          cleartextMessage: props.thread.body,
        })

        const pubKeys = await client.query<{ publicKeys: PublicKey[]}>({
          query: GET_PUBLICKEY,
          variables: {
            keyId: msg.getSigningKeyIDs().map((x) => x.toHex()),
          },
        })

        const keys = await openpgp.readKeys({
          armoredKeys: pubKeys.data.publicKeys.map(x => x.armoredKey).join("")
        })

        if (!(await Promise.all(keys.map(x => x.isRevoked())))) {
          setStatus(VerifiedStatus.Revoked)
          return
        }

        try {
          const verify = await msg.verify(keys)

          const verifications = await Promise.all(
            verify.map(x => x.verified)
          )

          if (verifications.every((x) => x)) {
            setStatus(VerifiedStatus.Success)
          } else {
            setStatus(VerifiedStatus.NoMatch)
          }
        } catch (e: any) {
          console.error("Verify Error", e)
          setStatus(VerifiedStatus.Error)
        }
      })()
    }
  }, [props.thread])

  switch (status) {
    case VerifiedStatus.Working:
      return <span className="text-sig-working">{'[WORKING...]'}</span>
    case VerifiedStatus.Error:
      return <span className="text-sig-error">{'[ERROR]'}</span>
    case VerifiedStatus.NoMatch:
      return <span className="text-sig-nomatch">{'[!! NO MATCH !!]'}</span>
    case VerifiedStatus.Revoked:
      return <span className="text-sig-revoked">{'[REVOKED]'}</span>
    case VerifiedStatus.Success:
      return <span className="text-sig-success">{'[VERIFIED]'}</span>
    default:
      throw 'how'
  }
}

export default SigVerify
