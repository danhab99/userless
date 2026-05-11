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

export const EMPTY_SNAPSHOT: UserlessSnapshot = {
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

  return (
    <UserlessContext.Provider value={{ userless, snapshot: EMPTY_SNAPSHOT }}>
      {props.children}
    </UserlessContext.Provider>
  );
}

export function useUserless() {
  return useContext(UserlessContext);
}
