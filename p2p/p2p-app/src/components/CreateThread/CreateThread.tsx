import clsx from "clsx";
import style from "./CreateThread.module.css";
import { PostThread } from "@userless/ui-components";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import type { PrivateKeyDetail } from "../../lib/userless";
import { useUserless } from "../UserlessProvider/UserlessProvider";

export type CreateThreadProps = {};

export function CreateThread() {
  const { userless } = useUserless();
  const [show, setShow] = useState(false);
  const [armoredPrivateKeys, setArmoredPrivateKeys] = useState<string[]>([]);

  useEffect(() => {
    if (!show) return;
    userless.getPrivateKeys().then((keys: PrivateKeyDetail[]) => {
      setArmoredPrivateKeys(keys.map((key: PrivateKeyDetail) => key.armor));
    });
  }, [show, userless]);

  return (
    <div className={clsx([style.CreateThread])}>
      {show
        ? createPortal(
            <div className="base16-default-dark fixed inset-0 z-50 flex items-center justify-center bg-800 h-screen w-screen bg-opacity-80">
              <div className="relative max-h-[90vh] w-full max-w-2xl overflow-auto">
                <button
                  onClick={() => setShow(false)}
                  className="absolute right-1 top-1 text-300 hover:text-100"
                  aria-label="Close"
                >
                  ✕
                </button>
                <div className="p-6">
                  <PostThread
                    armoredPrivateKeys={armoredPrivateKeys}
                    onPost={async (signedMessage) => {
                      return userless.storeSignedThread(signedMessage);
                    }}
                    onPostCreated={() => {
                      setShow(false);
                    }}
                  />
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
      <button
        type="button"
        onClick={() => setShow((x) => !x)}
        className="fixed bottom-8 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold shadow-lg transition-transform hover:scale-110 active:scale-95"
        title="Create new thread"
      >
        +
      </button>
    </div>
  );
}
