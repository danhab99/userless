"use client";
import {
  ChangeEventHandler,
  FormEventHandler,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePrivateKeys } from "@/components/KeyContext";
import * as openpgp from "openpgp";
import { Thread } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useMap } from "react-use";
import { createHash } from "crypto";
import * as toml from "smol-toml";

export type PostThreadProps = {
  replyTo?: Pick<Thread, "hash">;
};

const MATCH_SHA256 = /[a-fA-F0-9]{64}/g;

export const PostThread = (props: PostThreadProps) => {
  const privateKeys = usePrivateKeys();

  const [body, setBody] = useState("");
  const [keyId, setKeyId] = useState<string>();
  const [files, filesControls] = useMap<Record<string, Blob>>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setKeyId(privateKeys[0]?.getFingerprint());
  }, [privateKeys]);

  const router = useRouter();

  const onSubmit: FormEventHandler<HTMLFormElement> = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      (async () => {
        setLoading(true);
        const skId =
          keyId?.length == 0 ? privateKeys[0].getFingerprint() : keyId;

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

        const fileHashes = Object.keys(files);
        const fileContents = Object.values(files);

        const allowHashs = MATCH_SHA256.exec(body);
        const deleteHashes = fileHashes.filter((x) => !allowHashs?.includes(x));

        deleteHashes?.forEach((hash) => {
          delete files[hash];
        });

        const uploadPromises = fileContents.map(async (data) => {
          const msg = await openpgp.createMessage({
            binary: new Uint8Array(await data.arrayBuffer()),
          });

          const sig = await openpgp.sign({
            message: msg,
            signingKeys: [pk as openpgp.PrivateKey],
            detached: true,
            format: "armored",
          });

          const f = new FormData();
          f.append("document", data);
          f.append("signature", sig.toString());

          const resp = await fetch("/upload", {
            method: "POST",
            body: f,
            redirect: "manual",
          });

          return resp.ok;
        });

        const info = toml.stringify({
          replyTo: props.replyTo?.hash,
        });

        const msg = await openpgp.createCleartextMessage({
          text: info.trim() + "\n\n---\n\n" + body.trim(),
        });

        const signedMsg = await openpgp.sign({
          message: msg,
          signingKeys: [pk],
          format: "armored",
        });

        const succeses = await Promise.all(uploadPromises);

        if (!succeses.every((x) => x)) {
          return;
        }

        const resp = await fetch("/post", {
          method: "POST",
          body: signedMsg,
          redirect: "manual",
        });

        setLoading(false);

        if (resp.ok) {
          const hash = await resp.text();
          router.push(`/t/${hash}`);
        } else {
          alert("Unable to post thread");
          console.error(resp);
        }
      })();
    },
    [privateKeys, files],
  );

  const textareaRef = useRef<HTMLTextAreaElement>();
  const fileinputRef = useRef<HTMLInputElement>();

  const handleAddFile: ChangeEventHandler<HTMLInputElement> = useCallback(
    async (e) => {
      const cur = textareaRef.current?.selectionEnd;

      const file = e.target.files?.item(0);
      if (!file) {
        return;
      }

      const buff = await file.arrayBuffer();
      const hasher = createHash("sha256");
      hasher.write(Buffer.from(buff));
      const hash = hasher.digest("hex");
      filesControls.set(hash, new Blob([buff], {
        type: file.type,
      }));

      const insert = file.type.includes("image")
        ? `![${file.name} ${hash.slice(0, 8)}](userless:///file/${hash})`
        : `[Download ${file.name} ${hash.slice(0, 8)}](userless:///file/${hash})`;

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
          <label className="px-2 flex-1 truncate overflow-hidden text-ellipsis whitespace-nowrap">
            {props.replyTo ? `Reply to ${props.replyTo.hash}` : "Body:"}
          </label>
        </div>
        <textarea
          ref={(ref) => {
            textareaRef.current = ref || undefined;
          }}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="w-full p-1"
          rows={10}
          required
        />

        <div>
          <label>Add file</label>
          <input
            type="file"
            onChange={handleAddFile}
            ref={(ref) => {
              fileinputRef.current = ref || undefined;
            }}
          />
        </div>

        <div className="flex flex-col md:flex-row">
          <select
            value={keyId}
            onChange={(e) => setKeyId(e.target.value)}
            defaultValue={privateKeys[0]?.getKeyID().toHex()}
            required
            className="w-8/10 w-full p-2 overflow-hidden"
          >
            {privateKeys.map((key, i) => (
              <option key={i} value={key.getFingerprint()}>
                {key.users[0].userID?.name} {"<"}
                {key.getKeyID().toHex()}
                {">"} {key.isDecrypted() ? "unlocked" : ""}
              </option>
            ))}
          </select>
          <button className="px-4" type="submit" disabled={loading}>
            {loading ? "Posting..." : "Post"}
          </button>
        </div>
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
