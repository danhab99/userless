"use client";
import { useCallback } from "react";
import { usePrivateKeys } from "@/components/KeyContext/KeyContext";
import * as openpgp from "openpgp";
import { Thread } from "@prisma/client";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";

export type PostThreadProps = {
  replyTo?: Pick<Thread, "hash">;
};

export const PostThread = (props: PostThreadProps) => {
  const privateKeys = usePrivateKeys();

  type FieldValues = {
    body: string;
    sk: string;
  };

  const { register, handleSubmit } = useForm<FieldValues>();

  const router = useRouter();

  const onSubmit = useCallback(
    (v: FieldValues) => {
      (async () => {
        const msg = await openpgp.createCleartextMessage({
          text: [
            props.replyTo?.hash ? `replyTo: ${props.replyTo.hash}` : "",
            "",
            v.body,
          ]
            .join("\n")
            .trim(),
        });

        const skId =
          v["sk"].length == 0 ? privateKeys[0].getKeyID().toHex() : v["sk"];

        var pk = privateKeys?.find((x) => x.getKeyID().toHex() === skId);
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

        const signedMsg = await openpgp.sign({
          message: msg,
          signingKeys: [pk],
          format: "armored",
        });

        const resp = await fetch("/post", {
          method: "POST",
          body: signedMsg,
        });

        if (resp.redirected) {
          router.push(resp.url);
        } else {
          alert("Unable to post thread");
          console.error(resp);
        }
      })();
    },
    [privateKeys],
  );

  return (
    <div className="bg-white shadow-xl">
      <form onSubmit={handleSubmit(onSubmit)}>
        <label className="px-2">
          {props.replyTo ? `Reply to ${props.replyTo.hash}` : "Body:"}
        </label>
        <textarea
          {...register("body")}
          className="w-full p-1"
          rows={10}
          required
        />
        <div className="flex flex-col md:flex-row">
          <select
            {...register("sk")}
            defaultValue={privateKeys[0]?.getKeyID().toHex()}
            required
            className="w-8/10 w-full p-2 overflow-hidden"
          >
            {privateKeys.map((key, i) => (
              <option key={i} value={key.getKeyID().toHex()}>
                {key.users[0].userID?.name} {"<"}
                {key.getKeyID().toHex()}
                {">"} {key.isDecrypted() ? "unlocked" : ""}
              </option>
            ))}
          </select>
          <button className="px-4" type="submit">
            Post
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
