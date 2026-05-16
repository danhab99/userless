import { useCallback, useEffect, useRef, useState } from "react";
import { useUserless } from "../UserlessProvider/UserlessProvider";
import { ActionButton } from "@userless/ui-components";
import * as openpgp from "openpgp";
import styles from "./KeyManagement.module.css";
import { KeyList } from "./KeyList";
import { KeyDetail } from "./KeyDetail";

export type KeyType = "private" | "public";

export type KeyInfo = {
  type: KeyType;
  fingerprint: string;
  userId: string;
  armor: string;
};

export function KeyManagementPage() {
  const { userless } = useUserless();
  const generateFormRef = useRef<HTMLFormElement | null>(null);
  const [keys, setKeys] = useState<KeyInfo[]>([]);
  const [selectedFingerprint, setSelectedFingerprint] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    comment: "",
    password: "",
  });

  const loadKeys = useCallback(async () => {
    try {
      setLoading(true);
      const loadedKeys: KeyInfo[] = [];
      let privateFingerprint: string | undefined;

      // Get private key
      const signingKey = await userless.getSigningKey();
      if (signingKey) {
        privateFingerprint = signingKey.getFingerprint().toUpperCase();
        const privateUserId = signingKey.getUserIDs()[0] || "Unknown";
        const privateArmor = signingKey.toPublic().armor();

        loadedKeys.push({
          type: "private",
          fingerprint: privateFingerprint,
          userId: privateUserId,
          armor: privateArmor,
        });
      }

      // Get public keys
      const publicKeys = await userless.getAllPublicKeysDetailed();
      for (const pubKey of publicKeys) {
        // Skip if it's our own key
        if (pubKey.fingerprint.toUpperCase() !== privateFingerprint) {
          loadedKeys.push({
            type: "public",
            fingerprint: pubKey.fingerprint,
            userId: pubKey.userId || "Unknown",
            armor: pubKey.armor,
          });
        }
      }

      setKeys(loadedKeys);
      setSelectedFingerprint(loadedKeys[0]?.fingerprint ?? null);
    } catch (error) {
      console.error("Failed to load keys:", error);
    } finally {
      setLoading(false);
    }
  }, [userless]);

  useEffect(() => {
    void loadKeys();
  }, [loadKeys]);

  const handleDeleteKey = useCallback(
    async (keyInfo: KeyInfo) => {
      if (keyInfo.type === "private") {
        await userless.deleteSigningKey();
      } else {
        await userless.deletePublicKey(keyInfo.fingerprint);
      }

      await loadKeys();
    },
    [loadKeys, userless],
  );

  const handleGeneratePrivateKey = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setGenerateError(null);
      setIsGenerating(true);

      try {
        const generated = await openpgp.generateKey({
          type: "rsa",
          rsaBits: 2048,
          userIDs: [
            {
              name: form.name.trim(),
              email: form.email.trim(),
              comment: form.comment.trim(),
            },
          ],
          passphrase: form.password,
          format: "armored",
        });

        await userless.saveSigningKey(
          generated.privateKey as string,
        );
        await loadKeys();
        setIsGenerateDialogOpen(false);
        setForm({ name: "", email: "", comment: "", password: "" });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to generate key";
        setGenerateError(message);
      } finally {
        setIsGenerating(false);
      }
    },
    [form.comment, form.email, form.name, form.password, loadKeys, userless],
  );

  return (
    <div className={styles.container}>
      <KeyList
        keys={keys}
        selectedFingerprint={selectedFingerprint}
        onSelect={setSelectedFingerprint}
        onGeneratePrivateKey={() => {
          setGenerateError(null);
          setIsGenerateDialogOpen(true);
        }}
        loading={loading}
      />

      <div className={styles.detail}>
        {selectedFingerprint ? (
          <KeyDetail
            keyInfo={keys.find((k) => k.fingerprint === selectedFingerprint)}
            userless={userless}
            onDeleteKey={handleDeleteKey}
          />
        ) : (
          <div className={styles.noSelection}>
            Select a key to view details
          </div>
        )}
      </div>

      {isGenerateDialogOpen ? (
        <div className={styles.dialogBackdrop}>
          <form
            ref={generateFormRef}
            className={styles.dialog}
            onSubmit={handleGeneratePrivateKey}
          >
            <h3>Generate Private Key</h3>

            <label className={styles.dialogLabel}>
              Name
              <input
                className={styles.dialogInput}
                required
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
              />
            </label>

            <label className={styles.dialogLabel}>
              Email
              <input
                className={styles.dialogInput}
                type="email"
                required
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({ ...current, email: event.target.value }))
                }
              />
            </label>

            <label className={styles.dialogLabel}>
              Comment
              <input
                className={styles.dialogInput}
                required
                value={form.comment}
                onChange={(event) =>
                  setForm((current) => ({ ...current, comment: event.target.value }))
                }
              />
            </label>

            <label className={styles.dialogLabel}>
              Password
              <input
                className={styles.dialogInput}
                type="password"
                required
                value={form.password}
                onChange={(event) =>
                  setForm((current) => ({ ...current, password: event.target.value }))
                }
              />
            </label>

            {generateError ? (
              <div className={styles.dialogError}>{generateError}</div>
            ) : null}

            <div className={styles.dialogActions}>
              <ActionButton
                label="Cancel"
                onClick={() => {
                  setIsGenerateDialogOpen(false);
                }}
              />
              <ActionButton
                label={isGenerating ? "Generating..." : "Generate"}
                color={isGenerating ? "text-gray-500" : undefined}
                onClick={() => {
                  if (isGenerating) {
                    return;
                  }

                  generateFormRef.current?.requestSubmit();
                }}
              />
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
