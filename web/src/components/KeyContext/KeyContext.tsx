import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react'
import type { Key } from 'openpgp'
import * as openpgp from 'openpgp'
import { useAsyncMemo } from 'src/useAsyncMemo'

const KeysContext = createContext<Key[]>([])

const KeyContextProvider = (props: React.PropsWithChildren<{}>) => {
  const [keys, setKeys] = useState<Key[]>([])

  useEffect(() => {
    const keyring = keys.map((key) => key.armor()).join('\n')
    localStorage.setItem('keyring', keyring)
  }, [keys])

  useEffect(() => {
    ;(async () => {
      const rawKeyRing = localStorage.getItem('keyring')
      const keys = await openpgp.readKeys({
        armoredKeys: rawKeyRing,
      })
      setKeys(keys)
    })()
  }, [])

  const addKey = useCallback(
    async (files: FileList) => {
      for (let i = 0; i < files.length; i++) {
        const file = files.item(i)
        const rawKeys = await file.text()

        try {
          const newKeyRing = await openpgp.readKeys({
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
    (index: number) => {
      setKeys((prev) => {
        return prev.filter((_, i) => i != index)
      })
    },
    [setKeys]
  )

  return (
    <KeysContext.Provider value={keys}>
      <div className="absolute bottom-0 right-0 border border-solid border-black bg-white p-4">
        <h4>Key mananger</h4>
        {keys.map((k, i) => (
          <KeyItem pgKey={k} onDelete={() => deleteKey(i)} key={i} />
        ))}
        <label>Add keys</label>
        <input type="file" multiple onChange={(e) => addKey(e.target.files)} />
      </div>
      {props.children}
    </KeysContext.Provider>
  )
}

export default KeyContextProvider

function KeyItem(props: { pgKey: Key; onDelete: () => void }) {
  const pgKey = useAsyncMemo(props.pgKey.getPrimaryUser, [props.pgKey])

  return (
    <div>
      {pgKey?.user.userID.name} {'<'}
      {pgKey?.user.userID.email}
      {'>'} {props.pgKey.getFingerprint()}
      <span
        className="mx-1 rounded-full bg-red-500 px-1 py-1 text-white"
        onClick={props.onDelete}
      >
        X
      </span>
    </div>
  )
}

export function usePrivateKeys() {
  return useContext(KeysContext)
}
