"use client";

import Link from "next/link";
import type { PropsWithChildren } from "react";
import {
  KeyContextProvider as CoreKeyContextProvider,
  useAddPrivateKey,
  useCreateKey,
  useMasterKey,
  usePrivateKeys,
} from "@userless/ui-components";
import { getUserlessUrl } from "../userless";

export function KeyContextProvider(props: PropsWithChildren) {
  return (
    <CoreKeyContextProvider
      LinkComponent={Link}
      getKeyHref={(fingerprint) => `/key/${fingerprint}`}
      userlessUrl={getUserlessUrl()}
    >
      {props.children}
    </CoreKeyContextProvider>
  );
}

export { useAddPrivateKey, useCreateKey, useMasterKey, usePrivateKeys };
