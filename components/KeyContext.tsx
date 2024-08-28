"use client";
import { useState, useEffect, useCallback } from "react";
import * as openpgp from "openpgp";
import ActionButton from "./ActionButton";
import Link from "next/link";
import {
  createStateContext,
  useAsync,
  useDeepCompareEffect,
  useLocalStorage,
  useSessionStorage,
} from "react-use";

const [usePrivateKeysState, PrivateKeysStateProvider] = createStateContext<
  openpgp.PrivateKey[]
>([]);
const [useDecryptedKeysState, DecryptedKeysStateProvider] = createStateContext<
  openpgp.PrivateKey[]
>([]);

function uniqueKeys(keys: openpgp.PrivateKey[][]) {
  const allKeys = keys.flat(1);
  return allKeys.filter(
    (k, i) =>
      allKeys.findIndex(
        (o) => o.getKeyID().toHex() === k.getKeyID().toHex(),
      ) === i,
  );
}

export const KeyContextProvider = (props: React.PropsWithChildren<{}>) => {
  return (
    <>
      <PrivateKeysStateProvider>
        <DecryptedKeysStateProvider>
          <KeyDrawer />
          {props.children}
        </DecryptedKeysStateProvider>
      </PrivateKeysStateProvider>
    </>
  );
};

function KeyDrawer() {
  "use client";
  const [privateKeysLocal, setPrivateKeysLocal] = useLocalStorage<string[]>(
    "ring",
    [],
  );
  const [decryptedKeysLocal, setDecryptedKeysLocal] = useSessionStorage<
    string[]
  >("ring", []);

  const [privateKeys, setPrivateKeys] = usePrivateKeysState();
  const [decryptedKeys, setDecryptedKeys] = useDecryptedKeysState();

  useDeepCompareEffect(() => {
    (async () => {
      if (decryptedKeys.length == 0) {
        const pks = await Promise.all(
          decryptedKeysLocal?.map((armored) =>
            openpgp.readPrivateKeys({
              armoredKeys: armored,
            }),
          ) ?? [],
        );
        setDecryptedKeys(pks.flat(1));
      } else {
        const armoredKeys = decryptedKeys.map((k) => k.armor());
        setDecryptedKeysLocal(armoredKeys);
      }
    })();
  }, [decryptedKeys, decryptedKeysLocal]);

  useDeepCompareEffect(() => {
    (async () => {
      if (privateKeys.length == 0) {
        const pks = await Promise.all(
          privateKeysLocal?.map((armored) =>
            openpgp.readPrivateKeys({
              armoredKeys: armored,
            }),
          ) ?? [],
        );
        setPrivateKeys(pks.flat(1));
      } else {
        const armoredKeys = privateKeys.map((k) => k.armor());
        setPrivateKeysLocal(armoredKeys);
      }
    })();
  }, [privateKeysLocal, privateKeys]);

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

export function KeyBody({ pgKey }: { pgKey: openpgp.PrivateKey }) {
  const primaryUser = useAsync(() => pgKey.getPrimaryUser(), [pgKey]);

  return (
    <span className="text-username">
      {primaryUser.value?.user.userID?.name}
      <Link href={`/k/${pgKey.getFingerprint()}`}>
        {"("}
        {pgKey.getFingerprint()}
        {")"}
      </Link>
      {"<"}
      {primaryUser.value?.user.userID?.email}
      {">"}
    </span>
  );
}

function KeyRow(props: { sk: openpgp.PrivateKey }) {
  const { sk } = props;
  const fingerPrint = sk.getFingerprint()

  const [_, setPrivateKeys] = usePrivateKeysState();
  const [__, setDecryptedKeys] = useDecryptedKeysState();

  const deleteKey = useCallback(() => {
    setPrivateKeys((prev) =>
      prev.filter((x) => x.getFingerprint() != sk.getFingerprint()),
    );
  }, [sk]);

  const unlock = useCallback(async () => {
    const primaryUser = await sk.getPrimaryUser()
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

  const [registerTrigger, setRegisterTrigger] = useState(false);

  const registered = useAsync(async () => {
    const resp = await fetch(`/k/${fingerPrint}/armored`, {
      method: "HEAD",
    });
    return resp.ok;
  }, [fingerPrint, registerTrigger]);

  const register = useCallback(async () => {
    const resp = await fetch("/register", {
      method: "POST",
      body: sk.toPublic().armor(),
    });
    if (!resp.ok) {
      alert("unable to register");
    }
    setTimeout(() => {
      setRegisterTrigger(x => !x);
    }, 50)
  }, [sk]);


  return (
    <div className="flex flex-row align-middle">
      <KeyBody pgKey={props.sk} />
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
