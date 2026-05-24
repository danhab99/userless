import React, { useMemo } from "react";
import {
  KeyContextStateProvider,
  type UserlessUiKeyState,
} from "@userless/ui-components";
import type { PrivateKeyDetail } from "../../lib/userless";
import { useUserless } from "../UserlessProvider/UserlessProvider";
import type { UserlessUiConfig } from "@userless/ui-components";
import * as openpgp from "openpgp";

/**
 * P2P-specific KeyContextProvider that:
 * - Uses KeyContextStateProvider (no UI drawer)
 * - Loads the signing key from Userless on init
 * - Provides it via standard hooks for PostThread
 */
export function P2PKeyContextProvider(
  props: React.PropsWithChildren<Omit<UserlessUiConfig, "navigateToThread">>,
) {
  const { appService } = useUserless();

  const keyStateHandlers = useMemo(() => {
    return {
      load: async (): Promise<UserlessUiKeyState> => {
        const privateKeys: PrivateKeyDetail[] = await appService.getPrivateKeys();
        const signingKey = await appService.getSigningKey();

        return {
          privateKeys: privateKeys.map((key) => key.armor),
          decryptedKeys: signingKey ? [signingKey.armor()] : [],
        };
      },
      save: async (state: UserlessUiKeyState): Promise<void> => {
        const desiredByFingerprint = new Map<string, string>();
        for (const armored of state.privateKeys) {
          try {
            const parsed = await openpgp.readPrivateKey({ armoredKey: armored });
            desiredByFingerprint.set(parsed.getFingerprint().toLowerCase(), armored);
          } catch {
            continue;
          }
        }

        const existing: PrivateKeyDetail[] = await appService.getPrivateKeys();
        const existingByFingerprint = new Map<string, string>(
          existing.map((key): [string, string] => [
            key.fingerprint.toLowerCase(),
            key.armor,
          ]),
        );

        for (const [fingerprint] of existingByFingerprint) {
          if (!desiredByFingerprint.has(fingerprint)) {
            await appService.deletePrivateKey(fingerprint);
          }
        }

        for (const [fingerprint, armored] of desiredByFingerprint) {
          if (existingByFingerprint.get(fingerprint) !== armored) {
            await appService.addPrivateKey(armored);
          }
        }

        const parsedDecrypted = await Promise.all(
          state.decryptedKeys.map(async (armored) => {
            try {
              return await openpgp.readPrivateKey({ armoredKey: armored });
            } catch {
              return undefined;
            }
          }),
        );
        const decryptedCandidates = parsedDecrypted.filter(
          (x): x is openpgp.PrivateKey => Boolean(x),
        );

        const currentSigningKey = await appService.getSigningKey();
        let nextSigningKeyArmor: string | undefined;

        if (decryptedCandidates.length > 0) {
          const preferred = decryptedCandidates[0].getFingerprint().toLowerCase();
          nextSigningKeyArmor = desiredByFingerprint.get(preferred);
        }

        if (!nextSigningKeyArmor && currentSigningKey) {
          nextSigningKeyArmor = desiredByFingerprint.get(
            currentSigningKey.getFingerprint().toLowerCase(),
          );
        }

        if (!nextSigningKeyArmor) {
          nextSigningKeyArmor = desiredByFingerprint.values().next().value;
        }

        if (nextSigningKeyArmor) {
          const currentArmor = currentSigningKey?.armor();
          if (currentArmor !== nextSigningKeyArmor) {
            await appService.saveSigningKey(nextSigningKeyArmor);
          }
        } else if (currentSigningKey) {
          await appService.deleteSigningKey();
        }
      },
    };
  }, [appService]);

  return (
    <KeyContextStateProvider {...props} keyStateHandlers={keyStateHandlers}>
      {props.children}
    </KeyContextStateProvider>
  );
}

