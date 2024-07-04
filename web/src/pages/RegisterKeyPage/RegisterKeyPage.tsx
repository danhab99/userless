import { Link, routes } from '@redwoodjs/router'
import { Metadata, useMutation } from '@redwoodjs/web'
import { useCallback } from 'react'

const ADD_KEY = gql`
  mutation AddPublicKey($armoredKey: String!) {
    createPublicKey(input: { armoredKey: $armoredKey }) {
      approved
      keyId
    }
  }
`

const RegisterKeyPage = () => {
  const [addKey] = useMutation(ADD_KEY)

  const register: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    async (e) => {
      const promises: Promise<unknown>[] = []

      for (let i = 0; i < e.target.files.length; i++) {
        const f = e.target.files.item(i)
        promises.push(
          addKey({
            variables: {
              armoredKey: await f.text(),
            },
          })
        )
      }

      await Promise.all(promises)
    },
    []
  )

  return (
    <>
      <Metadata title="RegisterKey" description="RegisterKey page" />

      <h1>RegisterKeyPage</h1>

      <input type="file" multiple onChange={register} />
    </>
  )
}

export default RegisterKeyPage
