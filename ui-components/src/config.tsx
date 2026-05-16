import {
  createContext,
  type ComponentType,
  type PropsWithChildren,
  type ReactNode,
  useContext,
} from "react";

export type UserlessUiKeyState = {
  privateKeys: string[];
  decryptedKeys: string[];
};

export type UserlessUiKeyStateHandlers = {
  load?: () => Promise<UserlessUiKeyState>;
  save?: (state: UserlessUiKeyState) => Promise<void> | void;
};

export type UiLinkProps = {
  href: string;
  children: ReactNode;
};

export type UserlessUiConfig = {
  userlessUrl?: string;
  getKeyHref?: (fingerprint: string) => string;
  LinkComponent?: ComponentType<UiLinkProps>;
  navigateToThread?: (hash: string) => void | Promise<void>;
  keyStateHandlers?: UserlessUiKeyStateHandlers;
};

const UserlessUiConfigContext = createContext<UserlessUiConfig>({});

function pickDefined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as Partial<T>;
}

export function UserlessUiProvider(
  props: PropsWithChildren<UserlessUiConfig>,
) {
  const { children, ...config } = props;

  return (
    <UserlessUiConfigContext.Provider value={config}>
      {children}
    </UserlessUiConfigContext.Provider>
  );
}

export function useUserlessUiConfig(overrides?: UserlessUiConfig) {
  const inherited = useContext(UserlessUiConfigContext);

  if (!overrides) {
    return inherited;
  }

  return {
    ...inherited,
    ...pickDefined(overrides),
  };
}