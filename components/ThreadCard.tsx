"use client";
import SigVerify from "@/components/SigVerify";
import mailto from "mailto-link";
import ThreadBody from "@/components/ThreadBody";
import { PostThread } from "@/components/PostThread";
import { useToggleButton } from "@/components/ToggleButton";
import { Thread, ThreadPolicy } from "@prisma/client";
import Link from "next/link";
import { ThreadForThreadCard } from "@/global";
import { Hash } from "@/components/Hash";
import { useMasterKey } from "./KeyContext";
import ActionButton from "./ActionButton";
import { useAsync, useAsyncFn, useAsyncRetry } from "react-use";
import * as openpgp from "openpgp";
import toml from "smol-toml";

type ThreadCardProps = {
  thread: ThreadForThreadCard;
  enableReplies?: boolean;
};

type AdminActionProps = {
  hash: string;
  newPolicy: Partial<ThreadPolicy>;
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

const ThreadCard = ({ thread }: ThreadCardProps) => {
  const [ReplyTB, showReply] = useToggleButton(false);
  const [SourceTB, showSource] = useToggleButton(false);
  const [FullTB, showFull] = useToggleButton(false);
  const master = useMasterKey();

  const policy = useAsyncRetry(async () => {
    if (master) {
      const resp = await fetch(`/thread/${thread.hash}/policy`);
      const policyTxt = await resp.text();
      return JSON.parse(policyTxt) as ThreadPolicy;
    }
  }, [master, thread]);

  const controls = (
    <div className="text-xs">
      {thread.policy.acceptsReplies ? (
        <ReplyTB trueLabel="Hide reply" falseLabel="Reply" />
      ) : null}
      <SourceTB trueLabel="Hide source" falseLabel="Source" />
      <FullTB trueLabel="Less" falseLabel="More" />
      {master.length > 0 ? (
        <>
          <AdminAction
            hash={thread.hash}
            newPolicy={{
              visible: false,
            }}
            label="Delete"
            loadingLabel="Deleting"
            onClick={policy.retry}
            color="red"
          />
          <AdminAction
            hash={thread.hash}
            newPolicy={{
              acceptsReplies: !policy.value?.advertise
            }}
            label={
              policy.value?.advertise
                ? "Disable replies"
                : "Enable replies"
            }
            loadingLabel="Changing..."
            onClick={policy.retry}
            color="red"
          />
          <AdminAction
            hash={thread.hash}
            newPolicy={{
              advertise: !policy.value?.advertise
            }}
            label={
              policy.value?.advertise
                ? "Unpublish"
                : "Publish"
            }
            loadingLabel="Changing..."
            onClick={policy.retry}
            color="blue"
          />
        </>
      ) : null}
    </div>
  );

  const mailtoLink = mailto({
    to: thread.signedBy.email,
  });

  return (
    <>
      <div className="card my-2 max-w-4xl bg-card p-4">
        <p className="text-sm">
          <span className="text-green-700">
            {new Date(thread.timestamp).toLocaleString()}
          </span>{" "}
          <span className="text-username">
            {thread.signedBy.name}
            <Link href={`/key/${thread.signedBy.finger}`}>
              {"("}
              <Hash content={thread.signedBy.finger} />
              {")"}
            </Link>
            <a href={mailtoLink} target="_blank">
              {"<"}
              {thread.signedBy.email}
              {">"}
            </a>
          </span>{" "}
          <Link className="text-slate-600" href={`/thread/${thread.hash}`}>
            <Hash content={thread.hash} />
          </Link>{" "}
          <SigVerify content={thread.body} />
        </p>

        {controls}

        <div className={showFull ? "h-full" : "max-h-96 overflow-y-auto"}>
          <ThreadBody thread={thread as Thread} />
        </div>

        {controls}

        {showReply ? (
          <div className="pt-4">
            <PostThread replyTo={thread} />
          </div>
        ) : null}

        {showSource ? (
          <pre className="h-40 overflow-auto bg-slate-900 text-xs text-slate-100 p-1">
            {thread.body}
          </pre>
        ) : null}
      </div>
    </>
  );
};

export default ThreadCard;

type ThreadCardFromHashProps = {
  hash: string;
};

export function ThreadCardFromHash(props: ThreadCardFromHashProps) {
  const { value, loading } = useAsync(async () => {
    if (!props.hash) {
      return;
    }

    const [threadResp, policyResp] = await Promise.all([
      fetch(`/thread/${props.hash}/txt`, {
        cache: "force-cache",
      }),
      fetch(`/thread/${props.hash}/policy`),
    ]);

    const threadContent = await threadResp.text();

    const msg = await openpgp.readCleartextMessage({
      cleartextMessage: threadContent,
    });

    const publicKeyResp = await fetch(
      `/k/${msg.getSigningKeyIDs()[0].toHex()}/armored`,
      {
        cache: "force-cache",
      },
    );

    const pk = await openpgp.readKey({
      armoredKey: await publicKeyResp.text(),
    });

    const primaryUser = await pk.getPrimaryUser();

    const content = msg.getText();
    var [infoContent, body] = content.split("\n---\n", 2);

    var info: Record<string, toml.TomlPrimitive> | undefined;

    if (!body) {
      info = toml.parse(infoContent);
    }

    body = body || infoContent;

    return {
      body: threadContent,
      hash: props.hash,
      id: "",
      policy: await policyResp.json(),
      replyTo: info?.["replyTo"],
      signedBy: {
        email: primaryUser.user.userID?.email,
        finger: pk.getFingerprint(),
        name: primaryUser.user.userID?.name,
      },
      signedById: pk.getFingerprint(),
    } as ThreadForThreadCard;
  }, [props.hash]);

  if (loading) {
    return <h3>Loading...</h3>;
  } else {
    return value ? (
      <ThreadCard thread={value} />
    ) : (
      <h3 className="font-bold text-xl text-red-500">404: thread not found</h3>
    );
  }
}
