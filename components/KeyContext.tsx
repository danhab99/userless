"use client";
import { useState, useCallback, useEffect, useMemo } from "react";
import * as openpgp from "openpgp";
import ActionButton from "./ActionButton";
import Link from "next/link";
import {
  createStateContext,
  useAsync,
  useAsyncRetry,
  useDeepCompareEffect,
  useLocalStorage,
  useSessionStorage,
  useShallowCompareEffect,
} from "react-use";
import { Hash } from "./Hash";

const [usePrivateKeysState, PrivateKeysStateProvider] = createStateContext<
  openpgp.PrivateKey[]
>([]);
const [useDecryptedKeysState, DecryptedKeysStateProvider] = createStateContext<
  openpgp.PrivateKey[]
>([]);
const [useMasterKeysState, MasterKeysStateProvider] = createStateContext<
  openpgp.PrivateKey[]
>([]);

export function useMasterKey() {
  return useMasterKeysState()[0];
}

function uniqueKeys(keys: openpgp.PrivateKey[][]) {
  return useMemo(() => {
    const allKeys = keys.flat(1);
    return allKeys.filter(
      (k, i) =>
        allKeys.findIndex(
          (o) => o.getKeyID().toHex() === k.getKeyID().toHex(),
        ) === i,
    );
  }, [keys]);
}

export const KeyContextProvider = (props: React.PropsWithChildren<{}>) => {
  return (
    <>
      <PrivateKeysStateProvider>
        <DecryptedKeysStateProvider>
          <MasterKeysStateProvider>
            <MasterLoader />
            <KeyDrawer />
            {props.children}
          </MasterKeysStateProvider>
        </DecryptedKeysStateProvider>
      </PrivateKeysStateProvider>
    </>
  );
};

function MasterLoader() {
  const privateKeys = usePrivateKeys();
  const setMasters = useMasterKeysState()[1];

  const { value: testMessage } = useAsync(async () => {
    const resp = await fetch("/admin", {
      cache: "force-cache",
    });

    const test = await resp.text();

    const msg = await openpgp.readMessage({
      armoredMessage: test,
    });

    return msg;
  }, []);

  useShallowCompareEffect(() => {
    if (testMessage) {
      (async () => {
        const masks = await Promise.all(
          privateKeys.map(
            (pk) =>
              new Promise<boolean>(async (resolve) => {
                try {
                  await openpgp.decrypt({
                    message: testMessage,
                    decryptionKeys: [pk],
                  });
                  console.log("This key is admin", pk);
                  resolve(true);
                } catch (e: any) {
                  console.error("Decrypt error", e);
                  resolve(false);
                }
              }),
          ),
        );

        const masterKeys = privateKeys.filter((_, i) => masks[i]);
        setMasters(masterKeys);
      })();
    }
  }, [testMessage, privateKeys]);

  return <></>;
}

function useKeyBridge(
  useKeys: ReturnType<typeof useState<openpgp.PrivateKey[] | undefined>>,
  useLocal: ReturnType<typeof useState<string[]>>,
) {
  const [local, setLocal] = useLocal;
  const [keys, setKeys] = useKeys;

  useDeepCompareEffect(() => {
    (async () => {
      if (keys?.length == 0) {
        const pks = await Promise.all(
          local?.map((armored) =>
            openpgp.readPrivateKeys({
              armoredKeys: armored,
            }),
          ) ?? [],
        );
        setKeys(pks.flat(1));
      } else {
        const armoredKeys = keys?.map((k) => k.armor());
        setLocal(armoredKeys);
      }
    })();
  }, [keys, local]);
}

function KeyDrawer() {
  const [privateKeysLocal, setPrivateKeysLocal] = useLocalStorage<string[]>(
    "ring",
    [],
  );
  const [decryptedKeysLocal, setDecryptedKeysLocal] = useSessionStorage<
    string[]
  >("ring", []);

  const [privateKeys, setPrivateKeys] = usePrivateKeysState();
  const [decryptedKeys, setDecryptedKeys] = useDecryptedKeysState();

  useKeyBridge(
    [privateKeys, setPrivateKeys],
    [privateKeysLocal, setPrivateKeysLocal],
  );

  useKeyBridge(
    [decryptedKeys, setDecryptedKeys],
    [decryptedKeysLocal, setDecryptedKeysLocal],
  );

  const addKey = useCallback(
    async (files: FileList | null) => {
      if (!files) {
        return;
      }

      for (let i = 0; i < files.length; i++) {
        const file = files.item(i);
        if (!file) continue;

        const rawKeys = await file.text();

        try {
          const newKeyRing = await openpgp.readPrivateKeys({
            armoredKeys: rawKeys,
          });

          setPrivateKeys((oldKeyRing) => {
            const existingKeyIds = oldKeyRing.map((x) => x.getKeyID().toHex());
            const addKeys = newKeyRing.filter(
              (x) => !existingKeyIds.includes(x.getKeyID().toHex()),
            );

            return [...oldKeyRing, ...addKeys];
          });
        } catch (e) {
          console.error(e);
          alert(`Unable to add ${file.name}`);
        }
      }
    },
    [setPrivateKeys],
  );
  const allKeys = uniqueKeys([decryptedKeys, privateKeys]);

  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-0 right-0 bg-white p-4 shadow-lg">
      <h4 onClick={() => setOpen((x) => !x)}>
        {open ? "⮟" : "⮝"} Key mananger{" "}
        {open ? (
          <Link href="/generate-keys">
            <ActionButton label="Generate Key" />
          </Link>
        ) : null}
      </h4>
      {open ? (
        <>
          {allKeys.map((sk, i) => (
            <KeyRow sk={sk} key={i} />
          ))}
          <div className="pt-2">
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
  );
}

export function usePrivateKeys() {
  const [pk] = usePrivateKeysState();
  const [dk] = useDecryptedKeysState();
  return uniqueKeys([dk, pk]);
}

export function useAddPrivateKey(): (sk: openpgp.PrivateKey) => void {
  const [_, setPrivateKeys] = usePrivateKeysState();
  return useCallback(
    (sk: openpgp.PrivateKey) => setPrivateKeys((prev) => prev.concat(sk)),
    [setPrivateKeys],
  );
}

function keyBodyString(
  primaryUser: openpgp.PrimaryUser,
  pgKey: openpgp.PrivateKey,
): string {
  const keyid = pgKey.getKeyID().toHex();

  return `${primaryUser?.user.userID?.name}(${keyid})<${primaryUser?.user.userID?.email}>`;
}

function KeyRow(props: { sk: openpgp.PrivateKey }) {
  const { sk } = props;
  const keyId = sk.getKeyID().toHex();

  const setPrivateKeys = usePrivateKeysState()[1];
  const setDecryptedKeys = useDecryptedKeysState()[1];
  const masterKeys = useMasterKeysState()[0];

  const deleteKey = useCallback(() => {
    setPrivateKeys((prev) =>
      prev.filter((x) => x.getFingerprint() != sk.getFingerprint()),
    );
  }, [sk]);

  const unlock = useCallback(async () => {
    const primaryUser = await sk.getPrimaryUser();
    const password = prompt(
      `Password to decrypt ${keyBodyString(primaryUser, sk)}`,
    );
    const decryptedKey = await openpgp.decryptKey({
      privateKey: sk,
      passphrase: password ?? "",
    });

    setDecryptedKeys((prev) => {
      const keys = prev.reduce(
        (coll, sk) => {
          return {
            ...coll,
            [sk.getKeyID().toHex()]: sk,
          };
        },
        {} as Record<string, openpgp.PrivateKey>,
      );

      keys[sk.getKeyID().toHex()] = decryptedKey;

      return Object.values(keys);
    });
  }, [setDecryptedKeys]);

  const registered = useAsyncRetry(async () => {
    const resp = await fetch(`/k/${keyId}/armored`, {
      method: "HEAD",
      cache: "no-cache",
    });
    return resp.ok;
  }, [keyId]);

  const register = useCallback(async () => {
    const resp = await fetch("/register", {
      method: "POST",
      body: sk.toPublic().armor(),
    });

    if (!resp.ok && !resp.redirected) {
      alert("unable to register");
    }

    setTimeout(() => {
      registered.retry();
    }, 100);
  }, [sk, registered]);

  const primaryUser = useAsync(() => sk.getPrimaryUser(), [sk]);
  const isMaster =
    masterKeys.findIndex((x) => x.getKeyID().equals(sk.getKeyID())) >= 0;

  return (
    <div className="flex flex-row align-middle">
      <span className="text-username">
        {isMaster ? "👑" : ""}
        {primaryUser.value?.user.userID?.name}
        <Link href={`/k/${sk.getFingerprint()}`}>
          {"("}
          <Hash content={sk.getFingerprint()} />
          {")"}
        </Link>
        {"<"}
        {primaryUser.value?.user.userID?.email}
        {">"}
      </span>
      <ActionButton label="Delete" color="text-red-500" onClick={deleteKey} />

      {!(registered.value || registered.loading) ? (
        <ActionButton
          label="Register"
          color="text-purple-500"
          onClick={register}
        />
      ) : null}

      {sk.isDecrypted() ? null : (
        <ActionButton label="Unlock" color="text-blue-500" onClick={unlock} />
      )}
    </div>
  );
}
