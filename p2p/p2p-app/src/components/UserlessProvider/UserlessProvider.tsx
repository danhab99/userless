import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getUserless, type UserlessSnapshot } from "../../lib/userless";
import type { Userless } from "../../lib/userless";
import { usePrevious } from "react-use";

export type UserlessProviderProps = {};

type UserlessContextValue = {
  userless: Userless;
  snapshot: {
    connectionCount: number;
    uploadSpeed: number;
    downloadSpeed: number;
    threadCount: number;
    fileCount: number;
    keyCount: number;
  };
};

const EMPTY_SNAPSHOT = {
  connectionCount: 0,
  uploadSpeed: 0,
  downloadSpeed: 0,
  threadCount: 0,
  fileCount: 0,
  keyCount: 0,
};

const UserlessContext = createContext<UserlessContextValue>({
  snapshot: EMPTY_SNAPSHOT,
  userless: {} as any,
});

export function UserlessProvider(
  props: React.PropsWithChildren<UserlessProviderProps>,
) {
  const userless = useMemo(() => getUserless(), []);

  useEffect(() => {
    let active = true;
    let previous: UserlessSnapshot | undefined;
    let previousAt = Date.now();

    const refresh = async () => {
      const current = await userless.getSnapshot();
      if (!active) {
        return;
      }

      const now = Date.now();
      const elapsedSeconds = Math.max((now - previousAt) / 1000, 1);
      setSnapshot((prev) => ({
        connectionCount: current.connectionCount,
        uploadSpeed: previous
          ? (current.uploadedBytes - previous.uploadedBytes) / elapsedSeconds
          : 0,
        downloadSpeed: previous
          ? (current.downloadedBytes - previous.downloadedBytes) /
            elapsedSeconds
          : 0,
        threadCount: current.threadCount,
        fileCount: current.fileCount,
        keyCount: current.keyCount,
      }));

      previous = current;
      previousAt = now;
    };

    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, 1000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [userless]);

  return (
    <UserlessContext.Provider value={{ userless, snapshot }}>
      {props.children}
    </UserlessContext.Provider>
  );
}

export function useUserless() {
  return useContext(UserlessContext);
}
