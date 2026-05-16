import React, { useEffect } from "react";
import {
  KeyContextStateProvider,
  useAddPrivateKey,
} from "@userless/ui-components";
import { useUserless } from "../UserlessProvider/UserlessProvider";
import type { UserlessUiConfig } from "@userless/ui-components";

/**
 * P2P-specific KeyContextProvider that:
 * - Uses KeyContextStateProvider (no UI drawer)
 * - Loads the signing key from Userless on init
 * - Provides it via standard hooks for PostThread
 */
export function P2PKeyContextProvider(
  props: React.PropsWithChildren<Omit<UserlessUiConfig, "navigateToThread">>,
) {
  const { userless } = useUserless();
  const addPrivateKey = useAddPrivateKey();

  // Load signing key from Userless on mount
  useEffect(() => {
    (async () => {
      const signingKey = await userless.getOrCreateSigningKey();
      // Add the key to the context for PostThread to use
      addPrivateKey(signingKey);
    })();
  }, [userless, addPrivateKey]);

  return (
    <KeyContextStateProvider {...props}>
      {props.children}
    </KeyContextStateProvider>
  );
}
