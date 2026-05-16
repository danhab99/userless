"use client";
import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useReducer,
  createContext,
  useContext,
} from "react";
import { createPortal } from "react-dom";
import * as openpgp from "openpgp";
import { useAsync, useAsyncRetry } from "react-use";
import { ActionButton } from "../ActionButton/ActionButton";
import { Hash } from "../Hash/Hash";
import {
  type UiLinkProps,
  type UserlessUiConfig,
  UserlessUiProvider,
  useUserlessUiConfig,
} from "../config";
import { createUserlessClient, resolveUserlessUrl } from "../userless";

type State = {
  privateKeys: openpgp.PrivateKey[];
  decryptedKeys: openpgp.PrivateKey[];
  allKeys: openpgp.PrivateKey[];
  initialized: boolean;
};

type Action =
  | {
      action: "create";
      privateKey: openpgp.PrivateKey;
    }
  | {
      action: "delete";
      fingerprint: string;
    }
  | {
      action: "unlock";
      decryptedKey: openpgp.PrivateKey;
    }
  | {
      action: "load";
      privateKeys: openpgp.PrivateKey[];
      decryptedKeys: openpgp.PrivateKey[];
    };

const DefaultKeyState = {
  decryptedKeys: [],
  privateKeys: [],
  initialized: false,
  allKeys: [],
};

const KeyContextState = createContext<
  [State, React.ActionDispatch<[action: Action]>]
>([DefaultKeyState, () => {}] as any);

function DefaultLink(props: UiLinkProps) {
  return <a href={props.href}>{props.children}</a>;
}

function addPrivateKey(
  dispatch: React.ActionDispatch<[action: Action]>,
  privateKey: openpgp.PrivateKey,
) {
  dispatch({
    action: "create",
    privateKey,
  });

  if (privateKey.isDecrypted()) {
    dispatch({
      action: "unlock",
      decryptedKey: privateKey,
    });
  }
}

export function usePrivateKeys() {
  const [s] = useContext(KeyContextState);
  return s.allKeys;
}

export const useMasterKey = () => {
  const [s] = useContext(KeyContextState);
  return s.decryptedKeys;
};

export const useAddPrivateKey = () => {
  const [, dispatch] = useContext(KeyContextState);

  return (privateKey: openpgp.PrivateKey) => {
    addPrivateKey(dispatch, privateKey);
  };
};

export const KeyContextStateProvider = (
  props: React.PropsWithChildren<UserlessUiConfig>,
) => {
  const { children, ...config } = props;
  const r = useReducer((state: State, action: Action) => {
    const n = { ...state };

    switch (action.action) {
      case "create":
        n.privateKeys = [...n.privateKeys, action.privateKey];
        n.initialized = true;
        break;
      case "delete":
        const d = (x: openpgp.PrivateKey) =>
          x.getFingerprint() != action.fingerprint;
        n.decryptedKeys = n.decryptedKeys.filter(d);
        n.privateKeys = n.privateKeys.filter(d);
        break;
      case "unlock":
        n.decryptedKeys = [...state.decryptedKeys, action.decryptedKey];
        break;
      case "load":
        n.decryptedKeys = action.decryptedKeys;
        n.privateKeys = action.privateKeys;

        n.initialized = true;

        break;
    }

    n.allKeys = [...n.decryptedKeys, ...n.privateKeys].filter(
      (x, i, arr) =>
        i <= arr.findIndex((y) => x.getFingerprint() === y.getFingerprint()),
    );

    return n;
  }, DefaultKeyState);

  const [state, dispatch] = r;
  const savedSignatureRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    (async () => {
      if (state.initialized) {
        const keyState = {
          privateKeys: state.privateKeys.map((x) => x.armor()),
          decryptedKeys: state.decryptedKeys.map((x) => x.armor()),
        };
        const signature = JSON.stringify(keyState);

        if (savedSignatureRef.current === signature) {
          return;
        }

        savedSignatureRef.current = signature;
        await config.keyStateHandlers?.save?.(keyState);
      } else {
        const loadedState =
          (await config.keyStateHandlers?.load?.()) ?? {
            privateKeys: [],
            decryptedKeys: [],
          };

        const parseKeys = async (armoredKeys: string[]) => {
          const parsed = await Promise.all(
            armoredKeys.map(async (armoredKey) => {
              try {
                return await openpgp.readPrivateKey({ armoredKey });
              } catch {
                return undefined;
              }
            }),
          );
          return parsed.filter((key): key is openpgp.PrivateKey => Boolean(key));
        };

        const privateKeys = await parseKeys(loadedState.privateKeys);
        const decryptedKeys = await parseKeys(loadedState.decryptedKeys);

        savedSignatureRef.current = JSON.stringify({
          privateKeys: privateKeys.map((x) => x.armor()),
          decryptedKeys: decryptedKeys.map((x) => x.armor()),
        });

        dispatch({
          action: "load",
          privateKeys,
          decryptedKeys,
        });
      }
    })();
  }, [
    config.keyStateHandlers,
    state.initialized,
    state.privateKeys,
    state.decryptedKeys,
  ]);

  return (
    <UserlessUiProvider {...config}>
      <KeyContextState.Provider value={r}>
        {children}
      </KeyContextState.Provider>
    </UserlessUiProvider>
  );
};

export const KeyContextProvider = (
  props: React.PropsWithChildren<UserlessUiConfig>,
) => {
  const { children, ...config } = props;

  return (
    <KeyContextStateProvider {...config}>
      <KeyDrawer />
      {children}
    </KeyContextStateProvider>
  );
};

const useAllKeys = () => useContext(KeyContextState);

export const useCreateKey = () => {
  const [, dispatch] = useContext(KeyContextState);

  return async (
    name: string,
    email: string,
    comment: string,
    passphrase: string,
  ) => {
    const privateKey = await openpgp.generateKey({
      userIDs: [
        {
          comment,
          email,
          name,
        },
      ],
      passphrase,
    });

    const sk = await openpgp.readPrivateKey({
      armoredKey: privateKey.privateKey,
    });

    addPrivateKey(dispatch, sk);
  };
};

export const useUnlockKey = () => {
  const [state, dispatch] = useContext(KeyContextState);

  return async (fingerprint: string, passphrase: string) => {
    const selectedKey = state.privateKeys.find(
      (x) => x.getFingerprint() === fingerprint,
    );

    if (selectedKey) {
      try {
        const decryptedKey = await openpgp.decryptKey({
          privateKey: selectedKey,
          passphrase,
        });

        dispatch({
          action: "unlock",
          decryptedKey,
        });
      } catch (e) {
        alert(`Unable to decrypt key ${e}`);
      }
    }
  };
};

export const useDeleteKey = () => {
  const [, dispatch] = useContext(KeyContextState);

  return async (fingerprint: string) => {
    dispatch({
      action: "delete",
      fingerprint,
    });
  };
};

export { useAllKeys };

export function KeyDrawer() {
  const [, dispatch] = useContext(KeyContextState);
  const addKey = useCreateKey();

  const [open, setOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [showGenerating, setShowGenerating] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Ensure we only render on client side to avoid hydration issues
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  const onGenerate = async (data: FormData) => {
    try {
      const name = data.get("name");
      const email = data.get("email");
      const comment = data.get("comment");
      const password = data.get("password");

      addKey(
        name?.toString() ?? "",
        email?.toString() ?? "",
        comment?.toString() ?? "",
        password?.toString() ?? "",
      );
      setShowGenerating(false);
    } catch (e) {}
  };

  const [allKeys] = useAllKeys();

  const exportHandler = () => {
    const blob = new Blob(
      [allKeys.privateKeys.map((k) => k.armor()).join("\n\n")],
      { type: "text/plain" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "userless-keys.asc";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const keyManagerContent = (
    <div
      className="fixed bottom-0 right-0 z-50 p-4 max-w-sm shadow-lg bg-gray-50"
    >
      <h4
        onClick={() => setOpen((x) => !x)}
        className="cursor-pointer select-none mb-2 flex items-center gap-2"
      >
        <span>{open ? "⌄" : "^"}</span>
        <span>Key manager</span>
      </h4>

      {open ? (
        <>
          {showGenerating ? (
            <div>
              <form className="grid grid-cols-2 gap-2" action={onGenerate}>
                <label className="text-right">Name</label>
                <input className="border border-gray-300" name="name" />
                <label className="text-right">Email</label>
                <input
                  className="border border-gray-300"
                  name="email"
                  type="email"
                />
                <label className="text-right">Comment</label>
                <input className="border border-gray-300" name="comment" />
                <label className="text-right">Password</label>
                <input
                  className="border border-gray-300"
                  name="password"
                  type="password"
                />
                <input
                  type="submit"
                  className="col-span-2 bg-red-500 text-white shadow-md rounded-md"
                  value="Generate"
                />
              </form>
            </div>
          ) : (
            allKeys.allKeys.map((sk, i) => <KeyRow sk={sk} key={i} />)
          )}
          <div className="pt-2 flex flex-row">
            <ActionButton
              onClick={() => setShowGenerating((x) => !x)}
              label="Generate Key"
              color="text-cyan-600"
            />
            <ActionButton
              onClick={() => inputRef.current?.click()}
              label="Load Keys"
              color="text-pink-600"
            />
            <ActionButton
              onClick={exportHandler}
              label="Export"
              color="text-purple-600"
            />
            <input
              ref={inputRef}
              type="file"
              multiple
              onChange={async (e) => {
                if (!e.target.files) {
                  throw "";
                }
                for (let i = 0; i < e.target.files.length; i++) {
                  const item = e.target.files.item(i);
                  if (!item) {
                    break;
                  }

                  const keys = await openpgp.readPrivateKeys({
                    armoredKeys: await item.text(),
                  });

                  for (const privateKey of keys) {
                    dispatch({
                      action: "create",
                      privateKey,
                    });
                  }
                }
              }}
              className="hidden"
            />
          </div>
        </>
      ) : null}
    </div>
  );

  // Use createPortal to render directly to document.body
  return createPortal(keyManagerContent, document.body);
}

function KeyRow(props: { sk: openpgp.PrivateKey }) {
  const { sk } = props;
  const keyId = sk.getKeyID().toHex();
  const config = useUserlessUiConfig();
  const LinkComponent = config.LinkComponent ?? DefaultLink;
  const keyHref =
    config.getKeyHref?.(sk.getFingerprint()) ?? `/key/${sk.getFingerprint()}`;

  const deleteKey = useDeleteKey();

  const unlock = useUnlockKey();

  const registered = useAsyncRetry(async () => {
    try {
      const server = createUserlessClient(config.userlessUrl);
      await server.getKey(keyId).getArmored();
      return true;
    } catch (e) {
      return false;
    }
  }, [config.userlessUrl, keyId]);

  const register = useCallback(async () => {
    const u = resolveUserlessUrl(config.userlessUrl);
    const resp = await fetch(`${u}/register`, {
      method: "POST",
      body: sk.toPublic().armor(),
    });

    if (!resp.ok && !resp.redirected) {
      alert("unable to register");
    }

    setTimeout(() => {
      registered.retry();
    }, 100);
  }, [config.userlessUrl, registered, sk]);

  const primaryUser = useAsync(() => sk.getPrimaryUser(), [sk]);

  return (
    <div className="flex flex-row align-middle">
      <span className="text-username">
        {primaryUser.value?.user.userID?.name}
        <LinkComponent href={keyHref}>
          {"("}
          <Hash content={sk.getFingerprint()} />
          {")"}
        </LinkComponent>
        {"<"}
        {primaryUser.value?.user.userID?.email}
        {">"}
      </span>
      <ActionButton
        label="Delete"
        color="text-red-500"
        onClick={() => deleteKey(sk.getFingerprint())}
      />

      {!(registered.value || registered.loading) ? (
        <ActionButton
          label="Register"
          color="text-purple-500"
          onClick={register}
        />
      ) : null}

      {sk.isDecrypted() ? null : (
        <ActionButton
          label="Unlock"
          color="text-blue-500"
          onClick={() =>
            unlock(
              sk.getFingerprint(),
              prompt(
                `Unlock ${primaryUser.value?.user.userID?.name}#${sk.getFingerprint()}`,
              )!,
            )
          }
        />
      )}
    </div>
  );
}
