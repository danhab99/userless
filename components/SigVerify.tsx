"use client";
import { digestHash } from "@/lib/hash";
import * as openpgp from "openpgp";
import { useState } from "react";
import { useShallowCompareEffect } from "react-use";
import dynamic from "next/dynamic";

type SigVerifyProps = {
  content: string | ArrayBuffer;
  detatched?: boolean;
};

enum VerifiedStatus {
  Working,
  Success,
  NoMatch,
  Error,
  Revoked,
}

const SigVerify = (props: SigVerifyProps) => {
  const [status, setStatus] = useState<VerifiedStatus>(VerifiedStatus.Working);
  const [error, setError] = useState("");
  const [sig, setSig] = useState(
    typeof props.content === "string" ? props.content : undefined,
  );

  useShallowCompareEffect(() => {
    setStatus(VerifiedStatus.Working);
    (async () => {
      const getKey = async (keyId: string) => {
        const resp = await fetch(`/key/${keyId}/armored`, {
          cache: "force-cache",
        });
        if (!resp.ok) {
          setStatus(VerifiedStatus.Error);
          setError(
            `status code ${[resp.status, await resp.text()].filter((x) => x).join(" ")}`,
          );
          return;
        }

        const keys = await openpgp.readKeys({
          armoredKeys: await resp.text(),
        });

        const allRevoked = await Promise.all(keys.map((x) => x.isRevoked()));
        const revoked = allRevoked.some((x) => x);
        if (revoked) {
          setStatus(VerifiedStatus.Revoked);
          return;
        }

        return keys[0];
      };

      try {
        let verify: openpgp.VerificationResult[] = [];
        if (props.detatched) {
          const msg = await (props.content instanceof ArrayBuffer
            ? openpgp.createMessage({
                format: "binary",
                binary: Buffer.from(new Uint8Array(props.content)),
              })
            : openpgp.createMessage({
                text: props.content,
                format: "text",
              }));

          const hash = digestHash(
            typeof props.content === "string"
              ? props.content
              : Buffer.from(props.content),
          );
          const resp = await fetch(`/file/${hash}/sig`, {
            cache: "force-cache",
          });

          const sig = await resp.text();

          setSig(sig);

          const signature = await openpgp.readSignature({
            armoredSignature: sig,
          });

          const pk = await getKey(signature.getSigningKeyIDs()[0].toHex());

          if (pk) {
            verify = await msg.verify([pk]);
          }
        } else {
          const msg = await openpgp.readCleartextMessage({
            cleartextMessage: props.content as string,
          });
          const keys = await getKey(msg.getSigningKeyIDs()[0].toHex());
          if (!keys) {
            return;
          }

          verify = await msg.verify([keys]);
        }

        const verifications = await Promise.all(verify.map((x) => x.verified));

        if (verifications.every((x) => x)) {
          setStatus(VerifiedStatus.Success);
        } else {
          setStatus(VerifiedStatus.NoMatch);
        }
      } catch (e: any) {
        console.error("Verify Error", e);
        setStatus(VerifiedStatus.Error);
        setError(e);
      }
    })();
  }, [props]);

  let label;

  switch (status) {
    case VerifiedStatus.Working:
      label = <span className="text-sig-working">{"[WORKING...]"}</span>;
    case VerifiedStatus.Error:
      label = <span className="text-sig-error">{`[ERROR: ${error}]`}</span>;
    case VerifiedStatus.NoMatch:
      label = <span className="text-sig-nomatch">{"[!! NO MATCH !!]"}</span>;
    case VerifiedStatus.Revoked:
      label = <span className="text-sig-revoked">{"[REVOKED]"}</span>;
    case VerifiedStatus.Success:
      label = <span className="text-sig-success">{"[VERIFIED]"}</span>;
  }

  return (
    <a
      href={`https://cirw.in/gpg-decoder/#${encodeURIComponent(sig ?? "")}`}
      className="no-underline"
    >
      {label}
    </a>
  );
};

export default dynamic(() => Promise.resolve(SigVerify), {
  ssr: false,
});
