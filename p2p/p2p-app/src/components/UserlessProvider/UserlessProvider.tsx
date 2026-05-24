import React, { createContext, useContext, useMemo } from "react";
import {
  getAppService,
  getUserless,
  type UserlessSnapshot,
} from "../../lib/userless";
import type { AppService, Userless } from "../../lib/userless";

export type UserlessProviderProps = {};

type UserlessContextValue = {
  appService: AppService;
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
  appService: {} as AppService,
  snapshot: EMPTY_SNAPSHOT,
  userless: {} as any,
});

export function UserlessProvider(
  props: React.PropsWithChildren<UserlessProviderProps>,
) {
  const userless = useMemo(() => getUserless(), []);
  const appService = useMemo(() => getAppService(), []);

  return (
    <UserlessContext.Provider
      value={{ appService, userless, snapshot: EMPTY_SNAPSHOT }}
    >
      {props.children}
    </UserlessContext.Provider>
  );
}

export function useUserless() {
  return useContext(UserlessContext);
}
