import clsx from "clsx";
import style from "./CreateThread.module.css";
import { PostThread } from "@userless/ui-components";
import { useState } from "react";
import { createPortal } from "react-dom";
import { useUserless } from "../UserlessProvider/UserlessProvider";

export type CreateThreadProps = {};

export function CreateThread() {
  const { userless } = useUserless();
  const [show, setShow] = useState(false);

  return (
    <div className={clsx([style.CreateThread])}>
      {show
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black h-screen w-screen">
              <div className="relative max-h-[90vh] w-full max-w-2xl overflow-auto rounded-lg bg-white">
                <button
                  onClick={() => setShow(false)}
                  className="absolute right-1 top-1 text-gray-500 hover:text-gray-700"
                  aria-label="Close"
                >
                  ✕
                </button>
                <div className="p-6">
                  <PostThread
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
