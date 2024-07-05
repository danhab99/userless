import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react'
import * as openpgp from 'openpgp'
import { Link, routes } from '@redwoodjs/router'
import ActionButton from '../ActionButton/ActionButton'
import { useRegisterKey } from 'src/registerKey'
import { useAsyncMemo } from 'src/useAsyncMemo'
import { useQuery } from '@redwoodjs/web'
import { set } from '@redwoodjs/forms'

const PrivateKeysContext = createContext<openpgp.PrivateKey[]>([])
const ChangePrivateKeysContext = createContext<
  React.Dispatch<React.SetStateAction<openpgp.PrivateKey[]>>
>(() => {
  throw 'no context'
})

const KeyContextProvider = (props: React.PropsWithChildren<{}>) => {
  const [keys, setKeys] = useState<openpgp.PrivateKey[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    ;(async () => {
      const rawKeyRing = localStorage.getItem('keyring')
      const keys = await openpgp.readPrivateKeys({
        armoredKeys: rawKeyRing,
      })
      setKeys(keys)
      setReady(true)
    })()
  }, [])

  useEffect(() => {
    if (ready) {
      const keyring = keys.map((key) => key.armor()).join('\n')
      localStorage.setItem('keyring', keyring)
    }
  }, [keys, ready])

  const addKey = useCallback(
    async (files: FileList) => {
      for (let i = 0; i < files.length; i++) {
        const file = files.item(i)
        const rawKeys = await file.text()

        try {
          const newKeyRing = await openpgp.readPrivateKeys({
            armoredKeys: rawKeys,
          })

          setKeys((oldKeyRing) => {
            const existingKeyIds = oldKeyRing.map((x) => x.getKeyID().toHex())
            const addKeys = newKeyRing.filter(
              (x) => !existingKeyIds.includes(x.getKeyID().toHex())
            )

            return [...oldKeyRing, ...addKeys]
          })
        } catch (e) {
          console.error(e)
          alert(`Unable to add ${file.name}`)
        }
      }
    },
    [setKeys]
  )

  const deleteKey = useCallback(
    (sk: openpgp.PrivateKey) => {
      setKeys((prev) => {
        return [
          ...prev.filter((x) => x.getKeyID().toHex() != sk.getKeyID().toHex()),
        ]
      })
    },
    [setKeys]
  )

  const changeKey = useCallback(
    (sk: openpgp.PrivateKey) => {
      setKeys((prev) => {
        return prev.map((prev_sk) => {
          if (prev_sk.getKeyID().toHex() == sk.getKeyID().toHex()) {
            return sk
          } else {
            return prev_sk
          }
        })
      })
    },
    [setKeys]
  )

  const [open, setOpen] = useState(false)

  return (
    <PrivateKeysContext.Provider value={keys}>
      <div className="fixed bottom-0 right-0 border border-solid border-black bg-white p-4">
        <h4 onClick={() => setOpen((x) => !x)}>
          {open ? '⮟' : '⮝'} Key mananger{' '}
          {open ? (
            <Link to={routes.generateKey()}>
              <ActionButton label="Generate Key" />
            </Link>
          ) : null}
        </h4>
        {open ? (
          <>
            {keys.map((sk, i) => (
              <KeyRow
                sk={sk}
                key={i}
                deleteKey={deleteKey}
                changeKey={changeKey}
              />
            ))}
            <div>
              <label>Add keys</label>
              <input
                type="file"
                multiple
                onChange={(e) => addKey(e.target.files)}
              />
            </div>
          </>
        ) : null}
      </div>
      <ChangePrivateKeysContext.Provider value={setKeys}>
        {props.children}
      </ChangePrivateKeysContext.Provider>
    </PrivateKeysContext.Provider>
  )
}

export default KeyContextProvider

export function usePrivateKeys() {
  return useContext(PrivateKeysContext)
}

export function useAddPrivateKey(): (sk: openpgp.PrivateKey) => void {
  const set = useContext(ChangePrivateKeysContext)
  return useCallback(
    (sk: openpgp.PrivateKey) => set((prev) => prev.concat(sk)),
    [set]
  )
}

function keyBodyString(primaryUser: openpgp.PrimaryUser, pgKey: openpgp.PrivateKey): string {
  const keyid = pgKey.getKeyID().toHex()

  return `${primaryUser?.user.userID.name}(${keyid})<${primaryUser?.user.userID.email}>`
}

export function KeyBody({ pgKey }: { pgKey: openpgp.PrivateKey }) {
  const primaryUser = useAsyncMemo(() => pgKey.getPrimaryUser(), [pgKey])
  return <span className="text-username">{keyBodyString(primaryUser, pgKey,)}</span>
}

const CHECK_REGISTERED = gql`
  query CheckRegistered($keyId: String!) {
    publicKey(keyId: $keyId) {
      keyId
    }
  }
`

function KeyRow(props: {
  sk: openpgp.PrivateKey
  deleteKey: (sk: openpgp.PrivateKey) => void
  changeKey: (sk: openpgp.PrivateKey) => void
}) {
  const { sk } = props
  const keyId = sk.getKeyID().toHex()

  const registerKey = useRegisterKey()

  const { data } = useQuery<
    { publicKey: { keyId: string } },
    { keyId: string }
  >(CHECK_REGISTERED, {
    variables: {
      keyId,
    },
  })

  const primaryUser = useAsyncMemo(() => sk.getPrimaryUser(), [sk])

  const unlock = useCallback(() => {
    ;(async () => {
      debugger
      const password = prompt(`Password to decrypt ${keyBodyString(primaryUser, sk)}`)

      try {
        const osk = await openpgp.decryptKey({
          privateKey: sk,
          passphrase: password,
        })

        props.changeKey(osk)
      } catch (e) {
        alert(`Unable to unlock: ${keyBodyString(primaryUser, sk)}`)
      }
    })()
  }, [sk, props.changeKey, primaryUser])

  return (
    <div className="flex flex-row align-middle">
      <KeyBody pgKey={props.sk} />
      <ActionButton
        label="Delete"
        color="text-red-500"
        onClick={() => props.deleteKey(props.sk.getKeyID().toHex())}
      />

      {data?.publicKey?.keyId === keyId ? (
        <ActionButton
          label="Register"
          color="text-purple-500"
          onClick={() => registerKey(props.sk.toPublic())}
        />
      ) : null}

      {sk.isDecrypted() ? null : (
        <ActionButton
          label="Unlock"
          color="text-blue-500"
          onClick={() => unlock()}
        />
      )}
    </div>
  )
}
