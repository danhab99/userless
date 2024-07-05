import * as openpgp from 'openpgp'
import { useMutation } from '@redwoodjs/web'
import { CreatePublicKeyInput } from 'types/graphql'

const ADD_KEY = gql`
  mutation AddKey($armoredKey: String = "") {
    createPublicKey(input: { armoredKey: $armoredKey }) {
      keyId
    }
  }
`

export function useRegisterKey(): (pk: openpgp.PublicKey) => Promise<unknown> {
  const [addKey] = useMutation<
    { createPublicKey: { keyId: string } },
    { armoredKey: string }
  >(ADD_KEY)

  return async (pk) => {
    return addKey({
      variables: {
        armoredKey: pk.armor(),
      },
    })
  }
}
