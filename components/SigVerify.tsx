"use client";
import { Thread } from "@prisma/client";
import * as openpgp from "openpgp";
import { useEffect, useState } from "react";

type SigVerifyProps = {
  thread: Thread;
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

  useEffect(() => {
    if (props.thread) {
      setStatus(VerifiedStatus.Working);
      (async () => {
        const msg = await openpgp.readCleartextMessage({
          cleartextMessage: props.thread.body,
        });

        const resp = await fetch(`/k/${props.thread.signedById}/armored`, {
          cache: "force-cache",
        });
        if (!resp.ok) {
          setStatus(VerifiedStatus.Error);
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
        }
      })();
    }
  }, [props.thread]);

  var label: React.ReactNode;

  switch (status) {
    case VerifiedStatus.Working:
      label = <span className="text-sig-working">{"[WORKING...]"}</span>;
      break;
    case VerifiedStatus.Error:
      label = <span className="text-sig-error">{"[ERROR]"}</span>;
      break;
    case VerifiedStatus.NoMatch:
      label = <span className="text-sig-nomatch">{"[!! NO MATCH !!]"}</span>;
      break;
    case VerifiedStatus.Revoked:
      label = <span className="text-sig-revoked">{"[REVOKED]"}</span>;
      break;
    case VerifiedStatus.Success:
      label = <span className="text-sig-success">{"[VERIFIED]"}</span>;
      break;
    default:
      throw "how";
  }

  return (
    <>
      <div className="hs-tooltip inline-block">
        <button type="button" className="hs-tooltip-toggle">
          {label}
          <span
            className="hs-tooltip-content hs-tooltip-shown:opacity-100 hs-tooltip-shown:visible opacity-0 transition-opacity inline-block absolute invisible z-10 py-1 px-2 bg-gray-900 text-white"
            role="tooltip"
          >
            Tooltip on top
          </span>
        </button>
      </div>
    </>
  );
};

export default SigVerify;
