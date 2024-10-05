"use client";
import { digestHash } from "@/lib/hash";
import * as openpgp from "openpgp";
import { useState } from "react";
import { useShallowCompareEffect } from "react-use";

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

  useShallowCompareEffect(() => {
    setStatus(VerifiedStatus.Working);
    (async () => {
      const getKey = async (keyId: string) => {
        const resp = await fetch(`/k/${keyId}/armored`, {
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

          const hash = digestHash(Buffer.from(props.content));
          const resp = await fetch(`/f/${hash}/sig`, {
            cache: "force-cache",
          });

          const signature = await openpgp.readSignature({
            armoredSignature: await resp.text(),
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

  switch (status) {
    case VerifiedStatus.Working:
      return <span className="text-sig-working">{"[WORKING...]"}</span>;
    case VerifiedStatus.Error:
      return <span className="text-sig-error">{`[ERROR: ${error}]`}</span>;
    case VerifiedStatus.NoMatch:
      return <span className="text-sig-nomatch">{"[!! NO MATCH !!]"}</span>;
    case VerifiedStatus.Revoked:
      return <span className="text-sig-revoked">{"[REVOKED]"}</span>;
    case VerifiedStatus.Success:
      return <span className="text-sig-success">{"[VERIFIED]"}</span>;
    default:
      throw "how";
  }
};

export default SigVerify;
