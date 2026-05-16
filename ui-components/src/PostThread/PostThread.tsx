"use client";
import {
  ChangeEventHandler,
  FormEventHandler,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePrivateKeys } from "../KeyContext/KeyContext";
import * as openpgp from "openpgp";
import { useMap } from "react-use";
import * as toml from "smol-toml";
import { ActionButton } from "../ActionButton/ActionButton";
import { useUserlessUiConfig } from "../config";

export type PostThreadProps = {
  replyTo?: string;
  /**
   * Called to upload a file attachment. Receives the content hash, the file
   * blob, and the detached armored PGP signature. Return true on success.
   * If omitted, file attachments are silently skipped.
   */
  onUploadFile?: (hash: string, data: Blob, signature: string) => Promise<boolean>;
  /**
   * Called to submit the signed cleartext post. Receives the armored signed
   * message and should return the resulting content hash. Throw on failure.
   * If omitted, the signed message is not posted anywhere.
   */
  onPost?: (signedMessage: string) => Promise<string>;
  /** Called when a file is successfully uploaded */
  onFileCreated?: (hash: string, file: Blob) => void | Promise<void>;
  /** Called when the post/thread is successfully created */
  onPostCreated?: (hash: string, signedMessage: string) => void | Promise<void>;
  /** @deprecated Use onPostCreated instead */
  onPosted?: (hash: string) => void | Promise<void>;
  /** Armored private keys to show in the signing key dropdown. Falls back to KeyContext. */
  armoredPrivateKeys?: string[];
};

const MATCH_SHA256 = /[a-fA-F0-9]{64}/gm;

function arrayBufferToHex(buffer: ArrayBuffer) {
  const uint8Array = new Uint8Array(buffer);

  const hexString = Array.from(uint8Array)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return hexString;
}

export const PostThread = (props: PostThreadProps) => {
  const contextKeys = usePrivateKeys();
  const [parsedArmoredKeys, setParsedArmoredKeys] = useState<openpgp.PrivateKey[]>([]);

  useEffect(() => {
    if (!props.armoredPrivateKeys) return;
    Promise.all(
      props.armoredPrivateKeys.map((armoredKey) =>
        openpgp.readPrivateKey({ armoredKey }).catch(() => undefined),
      ),
    ).then((keys) =>
      setParsedArmoredKeys(keys.filter((k): k is openpgp.PrivateKey => Boolean(k))),
    );
  }, [props.armoredPrivateKeys]);

  const privateKeys = props.armoredPrivateKeys ? parsedArmoredKeys : contextKeys;
  // Use onPostCreated, falling back to onPosted for backward compatibility
  const postCreatedHandler = props.onPostCreated || props.onPosted;
  const config = useUserlessUiConfig({
    navigateToThread: props.onPosted
      ? (hash: string) => props.onPosted?.(hash)
      : undefined,
  });

  const [body, setBody] = useState("");
  const [keyId, setKeyId] = useState<string>();
  const [files, filesControls] = useMap<Record<string, Blob>>();
  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useState(0);
  const [thisStep, setThisStep] = useState(0);

  useEffect(() => {
    if (!loading) {
      setSteps(0);
    }
  }, [loading]);

  useEffect(() => {
    setKeyId(privateKeys[0]?.getFingerprint());
  }, [privateKeys]);

  const onSubmit: FormEventHandler<HTMLFormElement> = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setLoading(true);

      const increment = () => setThisStep((x) => x + 1);

      (async () => {
        const skId = !keyId ? privateKeys[0]?.getFingerprint() : keyId;

        var pk = privateKeys?.find((x) => x.getFingerprint() === skId);
        if (!pk) {
          throw "how";
        }
        if (!pk?.isPrivate()) {
          throw "not a pk";
        }

        if (!pk.isDecrypted()) {
          const password = prompt(
            `Password to decrypt ${pk.getKeyID().toHex()}`,
          );

          if (!password) {
            alert("Password required");
            return;
          }

          try {
            pk = await openpgp.decryptKey({
              privateKey: pk,
              passphrase: password,
            });
          } catch (e) {
            alert(e);
            return;
          }
        }

        const allowHashs = Array.from(body.matchAll(MATCH_SHA256)).map((x) =>
          x.toString(),
        );

        setSteps(3 * allowHashs.length + 4);

        const uploadPromises = Object.entries(files).map(
          async ([hash, data]) => {
            if (!allowHashs?.includes(hash)) {
              return;
            }

            const msg = await openpgp.createMessage({
              binary: new Uint8Array(await data.arrayBuffer()),
            });

            increment();

            const sig = await openpgp.sign({
              message: msg,
              signingKeys: [pk as openpgp.PrivateKey],
              detached: true,
              format: "armored",
            });

            increment();

            const ok = await props.onUploadFile?.(hash, data, sig.toString()) ?? true;

            if (ok) {
              await props.onFileCreated?.(hash, data);
            }

            return ok;
          },
        );

        let content = "";

        if (props.replyTo) {
          const info = toml.stringify({
            replyTo: props.replyTo,
          });
          content += info.trim() + "\n\n==========\n\n";
        }

        content += body.trim();

        const msg = await openpgp.createCleartextMessage({
          text: content,
        });

        increment();

        const signedMsg = await openpgp.sign({
          message: msg,
          signingKeys: [pk],
          format: "armored",
        });

        increment();
        const succeses = await Promise.all(uploadPromises);

        increment();
        if (!succeses.every((x) => x)) {
          return;
        }

        if (props.onPost) {
          const hash = await props.onPost(signedMsg.toString());

          increment();
          setLoading(false);

          await props.onPostCreated?.(hash, signedMsg.toString());
          await config.navigateToThread?.(hash);
        } else {
          increment();
          setLoading(false);
        }
      })();
    },
    [body, config, files, keyId, privateKeys, props.replyTo, props.onFileCreated, props.onPostCreated, props.onUploadFile, props.onPost],
  );

  const textareaRef = useRef<HTMLTextAreaElement>(undefined);
  const fileinputRef = useRef<HTMLInputElement>(undefined);

  const handleAddFile: ChangeEventHandler<HTMLInputElement> = useCallback(
    async (e) => {
      const cur = textareaRef.current?.selectionEnd;

      if (!e.target.files) {
        throw "requires files";
      }

      let insert = "";

      for (let i = 0; i < e.target.files?.length; i++) {
        const file = e.target.files?.item(i);
        if (!file) {
          return;
        }

        const buff = await file.arrayBuffer();

        const hash = await window.crypto.subtle.digest("SHA-256", buff);
        const hex = arrayBufferToHex(hash);
        filesControls.set(
          hex,
          new Blob([buff], {
            type: file.type,
          }),
        );

        insert += file.type.includes("image")
          ? `![${file.name} ${hex.slice(0, 8)}](userless:///file/${hex}) `
          : `[Download ${file.name} ${hex.slice(0, 8)}](userless:///file/${hex}) `;
      }

      setBody((prev) => prev.slice(0, cur) + insert + prev.slice(cur));

      if (fileinputRef.current?.value) {
        fileinputRef.current.value = "";
      }
    },
    [filesControls],
  );

  return (
    <div className="bg-white shadow-xl">
      <form onSubmit={onSubmit}>
        <div className="w-full flex">
          <label className="px-2 flex-1 truncate overflow-hidden text-ellipsis whitespace-nowrap bg-gray-100">
            {props.replyTo ? `Reply to ${props.replyTo}` : "Body:"}
          </label>
        </div>
        <textarea
          ref={(ref) => {
            textareaRef.current = ref || undefined;
          }}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="w-full p-1 bg-white border border-gray-300"
          rows={10}
          required
        />

        <div>
          <ActionButton
            label="Add File"
            color="text-blue-500"
            onClick={() => fileinputRef.current?.click()}
          />
          <ActionButton label="Bold" color="text-gray-500" onClick={() => {}} />
          <ActionButton
            label="Italics"
            color="text-gray-500"
            onClick={() => {}}
          />
          <input
            multiple
            type="file"
            onChange={handleAddFile}
            ref={(ref) => {
              fileinputRef.current = ref || undefined;
            }}
            hidden
          />
        </div>

        <div className="flex flex-col md:flex-row">
          <select
            value={keyId}
            onChange={(e) => setKeyId(e.target.value)}
            defaultValue={privateKeys[0]?.getKeyID().toHex()}
            required
            className="w-8/10 w-full p-2 overflow-hidden bg-gray-100"
          >
            {privateKeys.map((key, i) => (
              <option key={i} value={key.getFingerprint()}>
                {key.users[0].userID?.name} {"<"}
                {key.getKeyID().toHex()}
                {">"} {key.isDecrypted() ? "unlocked" : ""}
              </option>
            ))}
          </select>
          <button
            className="px-4 bg-yellow-300"
            type="submit"
            disabled={loading}
          >
            {loading ? "Posting..." : "Post"}
          </button>
        </div>

        {loading ? (
          <progress className="w-full" max={steps} value={thisStep} />
        ) : null}
      </form>
    </div>
  );
};

export function PostThreadNarrow(props: PostThreadProps) {
  return (
    <div className="centered">
      <div className="centered-widths">
        <PostThread {...props} />
      </div>
    </div>
  );
}
