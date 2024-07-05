import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react'
import * as openpgp from 'openpgp'

const PrivateKeysContext = createContext<openpgp.PrivateKey[]>([])
const ChangePrivateKeysContext = createContext<
  React.Dispatch<React.SetStateAction<openpgp.PrivateKey[]>>
>(() => {
  throw 'no context'
})

const KeyContextProvider = (props: React.PropsWithChildren<{}>) => {
  const [keys, setKeys] = useState<openpgp.PrivateKey[]>([])

  useEffect(() => {
    ;(async () => {
      const rawKeyRing = localStorage.getItem('keyring')
      const keys = await openpgp.readPrivateKeys({
        armoredKeys: rawKeyRing,
      })
      setKeys(keys)
    })()
  }, [])

  useEffect(() => {
    const keyring = keys.map((key) => key.armor()).join('\n')
    localStorage.setItem('keyring', keyring)
  }, [keys])

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
    (index: number) => {
      setKeys((prev) => {
        return [...prev.filter((_, i) => i != index)]
      })
    },
    [setKeys]
  )

  const [open, setOpen] = useState(false)

  return (
    <PrivateKeysContext.Provider value={keys}>
      <div className="fixed bottom-0 right-0 border border-solid border-black bg-white p-4">
        <h4 onClick={() => setOpen((x) => !x)}>
          {open ? '⮟' : '⮝'} Key mananger
        </h4>
        {open ? (
          <>
            {keys.map((k, i) => (
              <KeyItem pgKey={k} onDelete={() => deleteKey(i)} key={i} />
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
    (sk: openpgp.PrivateKey) => set((prev) => prev.concat(sk))
    ,
    [set]
  )
}

export function KeyBody(pgKey: openpgp.Key): string {
  const user = pgKey.users[0].userID
  return `${user.name} <${user.email}> ${pgKey.getKeyID().toHex()}`
}

const KeyItem = (props: { pgKey: openpgp.Key; onDelete?: () => void }) => {
  return (
    <div className="py-1 text-xs">
      {KeyBody(props.pgKey)}
      {props.onDelete ? (
        <span
          className="mx-1 rounded-full bg-red-500 px-1 py-1 text-white"
          onClick={props.onDelete}
        >
          X
        </span>
      ) : null}
    </div>
  )
}
