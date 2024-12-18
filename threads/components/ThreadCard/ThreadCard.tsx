"use client";
import SigVerify from "@/components/SigVerify/SigVerify";
import mailto from "mailto-link";
import ThreadBody from "@/components/ThreadBody/ThreadBody";
import { PostThread } from "@/components/PostThread/PostThread";
import { useToggleButton } from "@/components/ToggleButton/ToggleButton";
import Link from "next/link";
import { Hash } from "@/components/Hash/Hash";
import { useMasterKey } from "../KeyContext/KeyContext";
import { ActionButton } from "../ActionButton/ActionButton";
import { useAsync, useAsyncFn, useAsyncRetry } from "react-use";
import * as openpgp from "openpgp";
import toml from "smol-toml";
import { server } from "@/lib/userless";
import { spoofArmoredSignature } from "@/lib/utils";

export type ThreadCardProps = {
  threadText: string;
};

type AdminActionProps = {
  hash: string;
  newPolicy: Record<string, any>;
  label: string;
  loadingLabel: string;
  onClick: () => void;
  color: string;
};

function AdminAction(props: AdminActionProps) {
  const master = useMasterKey();

  const [{ loading }, trigger] = useAsyncFn(async () => {
    if (master) {
      const packet = await openpgp.sign({
        message: await openpgp.createCleartextMessage({
          text: toml.stringify(props.newPolicy),
        }),
        signingKeys: master,
      });

      const resp = await fetch(`/thread/${props.hash}/policy`, {
        method: "PATCH",
        body: packet,
      });

      await new Promise((r) => setTimeout(r, 50));

      props.onClick();

      return resp.ok;
    }
    return false;
  });

  return (
    <ActionButton
      color={`text-${props.color}-500`}
      label={loading ? props.loadingLabel : props.label}
      onClick={trigger}
    />
  );
}

export const ThreadCard = ({ threadText }: ThreadCardProps) => {
  const [ReplyTB, showReply] = useToggleButton(false);
  const [SourceTB, showSource] = useToggleButton(false);
  const [FullTB, showFull] = useToggleButton(false);
  const master = useMasterKey();

  const { value: thread } = useAsync(async () => {
    const msg = await openpgp.readCleartextMessage({
      cleartextMessage: threadText,
    });

    const hash = Array.from(
      new Uint8Array(
        await crypto.subtle.digest("sha-256", Buffer.from(threadText)),
      ),
    )
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const keyResp = await server.getKey(msg.getSigningKeyIDs()[0].toHex());
    const pk = await openpgp.readKey({
      armoredKey: keyResp.armored,
    });

    const userId = (await pk.getPrimaryUser()).user.userID;

    const sig = spoofArmoredSignature(threadText);

    const signature = await openpgp.readSignature({
      armoredSignature: sig,
    });

    return {
      body: msg.getText(),
      hash,
      signedBy: {
        ...userId,
        finger: pk.getFingerprint(),
      },
      timestamp: signature.packets[0].created,
    };
  }, [threadText]);

  const { value: policy } = useAsyncRetry(async () => {
    if (master && thread?.hash) {
      const resp = await fetch(`/thread/${thread?.hash}/policy`);
      const policyTxt = await resp.text();
      return JSON.parse(policyTxt);
    }
  }, [master, thread?.hash]);

  const controls = (
    <div className="text-xs">
      {policy.acceptsReplies ? (
        <ReplyTB trueLabel="Hide reply" falseLabel="Reply" />
      ) : null}
      <SourceTB trueLabel="Hide source" falseLabel="Source" />
      <FullTB trueLabel="Less" falseLabel="More" />
      {master.length > 0 ? (
        <>
          <AdminAction
            hash={thread?.hash ?? ""}
            newPolicy={{
              visible: false,
            }}
            label="Delete"
            loadingLabel="Deleting"
            onClick={policy.retry}
            color="red"
          />
          <AdminAction
            hash={thread?.hash ?? ""}
            newPolicy={{
              acceptsReplies: !policy.value?.acceptsReplies,
            }}
            label={
              policy.value?.acceptsReplies
                ? "Disable replies"
                : "Enable replies"
            }
            loadingLabel="Changing..."
            onClick={policy.retry}
            color="red"
          />
          <AdminAction
            hash={thread?.hash ?? ""}
            newPolicy={{
              advertise: !policy.value?.advertise,
            }}
            label={policy.value?.advertise ? "Unpublish" : "Publish"}
            loadingLabel="Changing..."
            onClick={policy.retry}
            color="blue"
          />
        </>
      ) : null}
    </div>
  );

  const mailtoLink = mailto({
    to: thread?.signedBy?.email,
  });

  return (
    <>
      <div className="card my-2 max-w-4xl bg-card p-4">
        <p className="text-sm">
          <span className="text-green-700">
            {new Date(thread?.timestamp ?? 0).toLocaleString()}
          </span>{" "}
          <span className="text-username">
            {thread?.signedBy?.name}
            <Link href={`/key/${thread?.signedBy?.finger}`}>
              {"("}
              <Hash content={thread?.signedBy?.finger ?? ""} />
              {")"}
            </Link>
            <a href={mailtoLink} target="_blank">
              {"<"}
              {thread?.signedBy?.email}
              {">"}
            </a>
          </span>{" "}
          <Link className="text-slate-600" href={`/thread/${thread?.hash}`}>
            <Hash content={thread?.hash ?? ""} />
          </Link>{" "}
          <SigVerify content={thread?.body ?? ""} />
        </p>

        {controls}

        <div className={showFull ? "h-full" : "max-h-96 overflow-y-auto"}>
          <ThreadBody thread={thread} />
        </div>

        {controls}

        {showReply ? (
          <div className="pt-4">
            <PostThread replyTo={thread} />
          </div>
        ) : null}

        {showSource ? (
          <pre className="h-40 overflow-auto bg-slate-900 text-xs text-slate-100 p-1">
            {thread?.body}
          </pre>
        ) : null}
      </div>
    </>
  );
};
