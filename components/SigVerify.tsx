"use client";
import {ThreadForThreadCard} from "@/global";
import * as openpgp from "openpgp";
import { useEffect, useState } from "react";

type SigVerifyProps = {
  thread: ThreadForThreadCard;
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

  useEffect(() => {
    if (props.thread) {
      setStatus(VerifiedStatus.Working);
      (async () => {
        const msg = await openpgp.readCleartextMessage({
          cleartextMessage: props.thread.body,
        });

        const resp = await fetch(`/k/${props.thread.signedBy.finger}/armored`, {
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

        try {
          const verify = await msg.verify(keys);

          const verifications = await Promise.all(
            verify.map((x) => x.verified),
          );

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
    }
  }, [props.thread]);

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
