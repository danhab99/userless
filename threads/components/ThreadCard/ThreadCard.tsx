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
import { useAsyncFn, useAsyncRetry } from "react-use";
import * as openpgp from "openpgp";
import toml from "smol-toml";
import { getServer } from "@/lib/userless";

export type ThreadCardProps = {
  threadText: string;
  body: string;
  hash: string;
  signedBy: Partial<openpgp.UserIDPacket & { finger: string }>;
  timestamp: Date | null;
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

export const ThreadCard = ({
  threadText,
  body,
  hash,
  signedBy,
  timestamp,
}: ThreadCardProps) => {
  const [ReplyTB, showReply] = useToggleButton(false);
  const [SourceTB, showSource] = useToggleButton(false);
  const [FullTB, showFull] = useToggleButton(false);
  const master = useMasterKey();


  const { value: policy, retry } = useAsyncRetry(async () => {
    if (hash) {
      const server = getServer()
      const t = await server.resolveThread(hash);
      t

      return t.getPolicy();
    }
  }, [master, hash]);

  const controls = (
    <div className="text-xs">
      {policy?.acceptsReplies ? (
        <ReplyTB trueLabel="Hide reply" falseLabel="Reply" />
      ) : null}
      <SourceTB trueLabel="Hide source" falseLabel="Source" />
      <FullTB trueLabel="Less" falseLabel="More" />
      {master.length > 0 ? (
        <>
          <AdminAction
            hash={hash ?? ""}
            newPolicy={{
              visible: false,
            }}
            label="Delete"
            loadingLabel="Deleting"
            onClick={policy?.retry}
            color="red"
          />
          <AdminAction
            hash={hash ?? ""}
            newPolicy={{
              acceptsReplies: !policy?.value?.acceptsReplies,
            }}
            label={
              policy?.value?.acceptsReplies
                ? "Disable replies"
                : "Enable replies"
            }
            loadingLabel="Changing..."
            onClick={retry}
            color="red"
          />
          <AdminAction
            hash={hash ?? ""}
            newPolicy={{
              advertise: !policy?.value?.advertise,
            }}
            label={policy?.value?.advertise ? "Unpublish" : "Publish"}
            loadingLabel="Changing..."
            onClick={retry}
            color="blue"
          />
        </>
      ) : null}
    </div>
  );

  const mailtoLink = mailto({
    to: signedBy?.email,
  });

  return (
    <>
      <div className="card my-2 max-w-4xl bg-card p-4">
        <p className="text-sm">
          <span className="text-green-700">
            {new Date(timestamp ?? 0).toLocaleString()}
          </span>{" "}
          <span className="text-username">
            {signedBy?.name}
            <Link href={`/key/${signedBy?.finger}`}>
              {"("}
              <Hash content={signedBy?.finger ?? ""} />
              {")"}
            </Link>
            <a href={mailtoLink} target="_blank">
              {"<"}
              {signedBy?.email}
              {">"}
            </a>
          </span>{" "}
          <Link className="text-slate-600" href={`/thread/${hash}`}>
            <Hash content={hash ?? ""} />
          </Link>{" "}
          {body ? <SigVerify content={body} /> : null}
        </p>

        {controls}

        <div className={showFull ? "h-full" : "max-h-96 overflow-y-auto"}>
          <ThreadBody body={body ?? ""} />
        </div>

        {controls}

        {showReply ? (
          <div className="pt-4">
            <PostThread replyTo={hash} />
          </div>
        ) : null}

        {showSource ? (
          <pre className="h-40 overflow-auto bg-slate-900 text-xs text-slate-100 p-1">
            {threadText}
          </pre>
        ) : null}
      </div>
    </>
  );
};
