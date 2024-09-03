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
import { useHasMaster, useMasterKey } from "./KeyContext";
import ActionButton from "./ActionButton";
import { useAsync, useAsyncFn } from "react-use";
import * as openpgp from "openpgp";
import {useState} from "react";

type ThreadCardProps = {
  thread: ThreadForThreadCard;
};

const ThreadCard = ({ thread }: ThreadCardProps) => {
  "use client";
  const [ReplyTB, showReply] = useToggleButton(false);
  const [SourceTB, showSource] = useToggleButton(false);
  const [FullTB, showFull] = useToggleButton(false);
  const [refresh, setRefresh] = useState(false);

  function Controls() {
    const master = useMasterKey();

    const policy = useAsync(async () => {
      if (master) {
        const resp = await fetch(`/t/${thread.hash}/policy`);
        const policyTxt = await resp.text();
        const message = await openpgp.readMessage({
          armoredMessage: policyTxt,
        });
        const msg = await openpgp.decrypt({
          message,
          decryptionKeys: [master],
        });

        const policyRaw = msg.data.toString();
        return JSON.parse(policyRaw) as ThreadPolicy;
      }
    }, [master, thread, refresh]);

    const change = async (policy: Partial<ThreadPolicy>) => {
      if (master) {
        const packet = await openpgp.sign({
          message: await openpgp.createCleartextMessage({
            text: JSON.stringify(policy),
          }),
          signingKeys: [master],
        });

        const resp = await fetch(`/t/${thread.hash}/policy`, {
          method: "PATCH",
          body: packet,
        });

        setRefresh(x => !x);

        return resp.ok;
      }
      return false;
    };

    const [{ loading: deleting }, doDelete] = useAsyncFn(() => {
      return change({
        visible: false,
      });
    });

    const [{ loading: disablingReplies }, disableReplies] = useAsyncFn(() => {
      return change({
        acceptsReplies: !policy.value?.acceptsReplies,
      });
    });

    return (
      <div className="text-xs">
        <ReplyTB trueLabel="Hide reply" falseLabel="Reply" />
        <SourceTB trueLabel="Hide source" falseLabel="Source" />
        <FullTB trueLabel="Less" falseLabel="More" />
        {master ? (
          <>
            <ActionButton
              color="text-red-500"
              label={deleting ? "Deleting" : "Delete"}
              onClick={doDelete}
            />
            <ActionButton
              color="text-red-500"
              label={
                disablingReplies
                  ? "Changing..."
                  : policy.value?.acceptsReplies
                    ? "Disable replies"
                    : "Enable replies"
              }
              onClick={disableReplies}
            />
          </>
        ) : null}
      </div>
    );
  }

  const mailtoLink = mailto({
    to: thread.signedBy.email,
  });

  return (
    <div className="card my-2 max-w-4xl bg-card p-4">
      <p className="text-sm">
        <span className="text-green-700">
          {new Date(thread.timestamp).toLocaleString()}
        </span>{" "}
        <span className="text-username">
          {thread.signedBy.name}
          <Link href={`/k/${thread.signedBy.finger}`}>
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
        <Link className="text-slate-600" href={`/t/${thread.hash}`}>
          <Hash content={thread.hash} />
        </Link>{" "}
        <SigVerify thread={thread} />
      </p>
      <Controls />
      <div className={showFull ? "h-full" : "max-h-96 overflow-y-auto"}>
        <ThreadBody thread={thread as Thread} />
      </div>
      <Controls />
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
  );
};

export default ThreadCard;
