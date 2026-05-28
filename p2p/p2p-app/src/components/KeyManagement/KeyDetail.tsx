import { useEffect, useState } from "react";
import { ActionButton } from "@userless/ui-components";
import styles from "./KeyManagement.module.css";
import type { KeyInfo } from "./KeyManagementPage";
import type { Userless } from "../../lib/userless";
import type { ResolvedThread, FileDetail } from "../../lib/userless";
import * as openpgp from "openpgp";

export type KeyDetailProps = {
  userless: Userless;
  keyInfo?: KeyInfo;
  onDeleteKey: (keyInfo: KeyInfo) => Promise<void>;
};

export function KeyDetail(props: KeyDetailProps) {
  const { userless, keyInfo, onDeleteKey } = props;
  const [threads, setThreads] = useState<ResolvedThread[]>([]);
  const [files, setFiles] = useState<FileDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [keyDetails, setKeyDetails] = useState<{
    name?: string;
    email?: string;
  }>({});

  useEffect(() => {
    if (!keyInfo) return;

    const loadDetails = async () => {
      try {
        setLoading(true);

        // Parse key to get more details
        try {
          const parsedKey = await openpgp.readKey({
            armoredKey: keyInfo.armor,
          });
          const userId = parsedKey.getUserIDs()[0] || "";
          const match = userId.match(/^(.*?)(?:\s*<([^>]+)>)?$/);
          setKeyDetails({
            name: match?.[1]?.trim(),
            email: match?.[2]?.trim(),
          });
        } catch (e) {
          console.error("Failed to parse key details:", e);
        }

        // Get threads signed by this key
        const signedThreads = await userless.getResolvedThreadsByPublicKey(
          keyInfo.fingerprint,
        );
        setThreads(signedThreads);

        // Get all files and filter by threads signed by this key
        const allFiles = await userless.getAllFilesDetailed();
        const threadHashes = signedThreads.map((t) => t.hash.toLowerCase());
        const relatedFiles = allFiles.filter(
          (f) =>
            f.sourceThreadHash &&
            threadHashes.includes(f.sourceThreadHash.toLowerCase()),
        );
        setFiles(relatedFiles);
      } catch (error) {
        console.error("Failed to load key details:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDetails();
  }, [keyInfo, userless]);

  if (!keyInfo) {
    return null;
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    // Optional: Show a brief toast notification
    console.log(`Copied ${label} to clipboard`);
  };

  return (
    <div className={styles.detailContent}>
      <div className={styles.keyHeader}>
        <div className={styles.keyHeaderLeft}>
          <h2 className={styles.keyTitle}>
            {keyInfo.type === "private" ? "Your Private Key" : "Public Key"}
          </h2>
          <p className={styles.keyUserId}>{keyInfo.userId}</p>
          {keyDetails.email && (
            <p className={styles.keyEmail}>{keyDetails.email}</p>
          )}
        </div>

        <div className={styles.keyStats}>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Threads</div>
            <div className={styles.statValue}>{threads.length}</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Files</div>
            <div className={styles.statValue}>{files.length}</div>
          </div>
        </div>
      </div>

      <div className={styles.fingerprintSection}>
        <label>Fingerprint</label>
        <div className={styles.fingerprintDisplay}>
          <code>{keyInfo.fingerprint}</code>
          <button
            className={styles.copyButton}
            onClick={() =>
              copyToClipboard(keyInfo.fingerprint, "fingerprint")
            }
            title="Copy fingerprint"
          >
            copy
          </button>
        </div>
        <div>
          <ActionButton
            color="text-red-700"
            label="Delete Key"
            onClick={() => {
              void onDeleteKey(keyInfo);
            }}
          />
        </div>
      </div>

      {keyInfo.type === "private" && (
        <details className={styles.armorDetails}>
          <summary>Private Key (Armored)</summary>
          <div className={styles.armorContent}>
            <pre>{keyInfo.armor}</pre>
            <button
              className={styles.copyButton}
              onClick={() => copyToClipboard(keyInfo.armor, "private key")}
            >
              Copy to Clipboard
            </button>
          </div>
        </details>
      )}

      <div className={styles.contentSection}>
        <h3>Threads ({threads.length})</h3>
        {loading ? (
          <div className={styles.loadingText}>Loading threads...</div>
        ) : threads.length === 0 ? (
          <div className={styles.emptyMessage}>
            No threads signed by this key
          </div>
        ) : (
          <div className={styles.threadList}>
            {threads.map((thread) => (
              <div
                key={thread.hash}
                className={clsx(styles.threadItem, {
                  [styles.expanded]: expanded === thread.hash,
                })}
              >
                <button
                  className={styles.threadToggle}
                  onClick={() =>
                    setExpanded(expanded === thread.hash ? null : thread.hash)
                  }
                >
                  <span className={styles.toggleIcon}>
                    {expanded === thread.hash ? "▼" : "▶"}
                  </span>
                  <span className={styles.threadPreview}>
                    {thread.body.slice(0, 100)}
                    {thread.body.length > 100 ? "..." : ""}
                  </span>
                  <code className={styles.threadHash}>
                    {thread.hash.slice(0, 8)}
                  </code>
                </button>

                {expanded === thread.hash && (
                  <div className={styles.threadContent}>
                    <div className={styles.threadBody}>{thread.body}</div>

                    <div className={styles.threadFooter}>
                      <code className={styles.fullHash}>
                        Hash: {thread.hash}
                      </code>
                      <button
                        className={styles.copyButton}
                        onClick={() =>
                          copyToClipboard(thread.hash, "thread hash")
                        }
                      >
                        copy
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {files.length > 0 && (
        <div className={styles.contentSection}>
          <h3>Associated Files ({files.length})</h3>
          <div className={styles.fileList}>
            {files.map((file) => (
              <div key={file.hash} className={styles.fileItem}>
                <div className={styles.fileHash}>
                  <code>{file.hash.slice(0, 16)}...</code>
                </div>
                <div className={styles.fileSize}>
                  {(file.size / 1024).toFixed(2)} KB
                </div>
                <button
                  className={styles.copyButton}
                  onClick={() => copyToClipboard(file.hash, "file hash")}
                  title="Copy file hash"
                >
                  copy
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function clsx(
  ...classes: (string | { [key: string]: boolean } | undefined)[]
): string {
  return classes
    .flatMap((c) => {
      if (!c) return [];
      if (typeof c === "string") return c;
      return Object.entries(c)
        .filter(([, v]) => v)
        .map(([k]) => k);
    })
    .join(" ");
}
