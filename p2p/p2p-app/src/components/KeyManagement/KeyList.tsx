import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";
import { ActionButton } from "@userless/ui-components";
import styles from "./KeyManagement.module.css";
import type { KeyInfo } from "./KeyManagementPage";

export type KeyListProps = {
  keys: KeyInfo[];
  selectedFingerprint: string | null;
  onSelect: (fingerprint: string) => void;
  onGeneratePrivateKey: () => void;
  loading: boolean;
};

export function KeyList(props: KeyListProps) {
  const { keys, selectedFingerprint, onSelect, onGeneratePrivateKey, loading } = props;
  const [tab, setTab] = useState<"private" | "public">("private");

  const privateKeys = useMemo(
    () => keys.filter((key) => key.type === "private"),
    [keys],
  );
  const publicKeys = useMemo(
    () => keys.filter((key) => key.type === "public"),
    [keys],
  );
  const visibleKeys = tab === "private" ? privateKeys : publicKeys;

  useEffect(() => {
    if (visibleKeys.length === 0) {
      return;
    }

    const selectedVisible = visibleKeys.some(
      (key) => key.fingerprint === selectedFingerprint,
    );
    if (!selectedVisible) {
      onSelect(visibleKeys[0].fingerprint);
    }
  }, [visibleKeys, selectedFingerprint, onSelect]);

  if (loading) {
    return (
      <div className={styles.sidebar}>
        <div className={styles.sidebarContent}>
          <div className={styles.loadingText}>Loading keys...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.sidebar}>
      <div className={styles.sidebarContent}>
        <div className={styles.sidebarHeader}>
          <h3>Keys</h3>
          <span className={styles.keyCount}>{keys.length}</span>
        </div>

        <div className={styles.sidebarTabs}>
          <button
            className={clsx(styles.sidebarTab, {
              [styles.sidebarTabActive]: tab === "private",
            })}
            onClick={() => setTab("private")}
          >
            Private Keys ({privateKeys.length})
          </button>
          <button
            className={clsx(styles.sidebarTab, {
              [styles.sidebarTabActive]: tab === "public",
            })}
            onClick={() => setTab("public")}
          >
            Public Keys ({publicKeys.length})
          </button>
        </div>

        {visibleKeys.length === 0 ? (
          <div className={styles.emptyMessage}>No keys found</div>
        ) : (
          <div className={styles.keyList}>
            {visibleKeys.map((key) => (
              <button
                key={key.fingerprint}
                onClick={() => onSelect(key.fingerprint)}
                className={clsx(styles.keyItem, {
                  [styles.selected]: selectedFingerprint === key.fingerprint,
                })}
              >
                <div className={styles.keyItemContent}>
                  <div className={styles.keyBadge}>
                    {key.type}
                  </div>
                  <div className={styles.keyUserIdTruncated}>
                    {key.userId}
                  </div>
                  <div className={styles.keyFingerprintTruncated}>
                    {key.fingerprint.slice(-8)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {tab === "private" ? (
          <div className={styles.sidebarFooterAction}>
            <ActionButton
              label="Generate Private Key"
              onClick={onGeneratePrivateKey}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
