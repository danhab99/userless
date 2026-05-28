import React, { createContext, useContext, useMemo } from "react";
import {
  getUserless,
  type UserlessSnapshot,
} from "../../lib/userless";
import type { Userless } from "../../lib/userless";
import type { FileManager } from "../../lib/file-manager";
import type { UserlessInspector } from "../../lib/inspector";
import type { KeyManager } from "../../lib/key-manager";
import type { PeerGateway } from "../../lib/peer-gateway";
import type { PeerScanner } from "../../lib/peer-scanner";
import type { ThreadResolver } from "../../lib/thread-resolver";

export type UserlessProviderProps = {};

type UserlessContextValue = {
  userless: Userless;
  keyManager: KeyManager;
  fileManager: FileManager;
  inspector: UserlessInspector;
  peerGateway: PeerGateway;
  peerScanner: PeerScanner;
  threadResolver: ThreadResolver;
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
  userless: {} as any,
  keyManager: {} as KeyManager,
  fileManager: {} as FileManager,
  inspector: {} as UserlessInspector,
  peerGateway: {} as PeerGateway,
  peerScanner: {} as PeerScanner,
  threadResolver: {} as ThreadResolver,
  snapshot: EMPTY_SNAPSHOT,
});

export function UserlessProvider(
  props: React.PropsWithChildren<UserlessProviderProps>,
) {
  const userless = useMemo(() => getUserless(), []);
  const keyManager = useMemo(() => userless.getKeyManager(), [userless]);
  const fileManager = useMemo(() => userless.getFileManager(), [userless]);
  const inspector = useMemo(() => userless.getInspector(), [userless]);
  const peerGateway = useMemo(() => userless.getPeerGateway(), [userless]);
  const peerScanner = useMemo(() => userless.getPeerScanner(), [userless]);
  const threadResolver = useMemo(() => userless.getThreadResolver(), [userless]);

  return (
    <UserlessContext.Provider
      value={{
        userless,
        keyManager,
        fileManager,
        inspector,
        peerGateway,
        peerScanner,
        threadResolver,
        snapshot: EMPTY_SNAPSHOT,
      }}
    >
      {props.children}
    </UserlessContext.Provider>
  );
}

export function useUserless() {
  return useContext(UserlessContext);
}
