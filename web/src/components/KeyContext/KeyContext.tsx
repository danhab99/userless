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
const DecryptedPrivateKeysContext = createContext<openpgp.PrivateKey[]>([])
const ChangePrivateKeysContext = createContext<
  React.Dispatch<React.SetStateAction<openpgp.PrivateKey[]>>
>(() => {
  throw 'no context'
})

function uniqueKeys(keys: openpgp.PrivateKey[][]) {
  const allKeys = keys.flat(1)
  return allKeys.filter((k, i) => allKeys.findIndex(o => o.getKeyID().toHex() === k.getKeyID().toHex()) === i);
}

const KeyContextProvider = (props: React.PropsWithChildren<{}>) => {
  const [keys, setKeys] = useState<openpgp.PrivateKey[]>([])
  const [decryptedKeys, setDecryptedKeys] = useState<openpgp.PrivateKey[]>([])
  useEffect(() => {
    ;(async () => {
      if (keys.length > 0) {
        sessionStorage.setItem(
          'keyring',
          JSON.stringify(decryptedKeys.map((key) => key.armor()))
        )

        localStorage.setItem(
          'keyring',
          JSON.stringify(keys.map((key) => key.armor()))
        )
      } else {
        const rawKeyRing: string[] = JSON.parse(localStorage.getItem('keyring'))

        const localKeys = Promise.all(
          rawKeyRing.map((rawKey) =>
            openpgp.readPrivateKey({
              armoredKey: rawKey,
            })
          )
        )

        const decryptedRawKeyRing: string[] = JSON.parse(
          sessionStorage.getItem('keyring')
        )
        const localDecryptedKeys = Promise.all(
          decryptedRawKeyRing.map((rawKey) =>
            openpgp.readPrivateKey({
              armoredKey: rawKey,
            })
          )
        )

        try {
          setKeys(await localKeys)
        } catch (e) {}

        try {
          setDecryptedKeys(await localDecryptedKeys)
        } catch (e) {}
      }
    })()
  }, [keys, decryptedKeys])

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
      setKeys((prev) =>
        prev.filter((x) => x.getKeyID().toHex() != sk.getKeyID().toHex())
      )
    },
    [setKeys]
  )

  const unlock = useCallback(
    async (sk: openpgp.PrivateKey, password: string) => {
      const decryptedKey = await openpgp.decryptKey({
        privateKey: sk,
        passphrase: password,
      })

      setDecryptedKeys((prev) => {
        const keys = prev.reduce((coll, sk) => {
          return {
            ...coll,
            [sk.getKeyID().toHex()]: sk,
          }
        }, {})

        keys[sk.getKeyID().toHex()] = decryptedKey

        return Object.values(keys)
      })
    },
    [setDecryptedKeys]
  )

  const allKeys = uniqueKeys([decryptedKeys, keys])

  const [open, setOpen] = useState(false)

  return (
    <>
      <PrivateKeysContext.Provider value={keys}>
        <DecryptedPrivateKeysContext.Provider value={decryptedKeys}>
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
                {allKeys.map((sk, i) => (
                  <KeyRow
                    sk={sk}
                    key={i}
                    deleteKey={deleteKey}
                    unlock={unlock}
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
        </DecryptedPrivateKeysContext.Provider>
      </PrivateKeysContext.Provider>
    </>
  )
}

export default KeyContextProvider

export function usePrivateKeys() {
  return uniqueKeys([
    useContext(DecryptedPrivateKeysContext),
    useContext(PrivateKeysContext),
  ])
}

export function useAddPrivateKey(): (sk: openpgp.PrivateKey) => void {
  const set = useContext(ChangePrivateKeysContext)
  return useCallback(
    (sk: openpgp.PrivateKey) => set((prev) => prev.concat(sk)),
    [set]
  )
}

function keyBodyString(
  primaryUser: openpgp.PrimaryUser,
  pgKey: openpgp.PrivateKey
): string {
  const keyid = pgKey.getKeyID().toHex()

  return `${primaryUser?.user.userID.name}(${keyid})<${primaryUser?.user.userID.email}>`
}

export function KeyBody({ pgKey }: { pgKey: openpgp.PrivateKey }) {
  const primaryUser = useAsyncMemo(() => pgKey.getPrimaryUser(), [pgKey])

  return (
    <span className="text-username">
      {primaryUser?.user.userID.name}
      <Link to={routes.key({ keyid: pgKey.getKeyID().toHex() })}>
        {'('}
        {pgKey.getKeyID().toHex()}
        {')'}
      </Link>
      {'<'}
      {primaryUser?.user.userID.email}
      {'>'}
    </span>
  )
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
  unlock: (sk: openpgp.PrivateKey, password: string) => void
}) {
  const { sk } = props
  const keyId = sk.getKeyID().toHex()

  const registerKey = useRegisterKey()

  const { data, refetch } = useQuery<
    { publicKey: { keyId: string } },
    { keyId: string }
  >(CHECK_REGISTERED, {
    variables: {
      keyId,
    },
  })

  const register = useCallback(async () => {
    await registerKey(sk)
    refetch()
  }, [refetch, registerKey, sk])

  const primaryUser = useAsyncMemo(() => sk.getPrimaryUser(), [sk])

  const unlock = useCallback(() => {
    ;(async () => {
      const password = prompt(
        `Password to decrypt ${keyBodyString(primaryUser, sk)}`
      )

      props.unlock(sk, password)
    })()
  }, [sk, props.unlock, primaryUser])

  return (
    <div className="flex flex-row align-middle">
      <KeyBody pgKey={props.sk} />
      <ActionButton
        label="Delete"
        color="text-red-500"
        onClick={() => props.deleteKey(props.sk)}
      />

      {data?.publicKey?.keyId !== keyId ? (
        <ActionButton
          label="Register"
          color="text-purple-500"
          onClick={() => register()}
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
