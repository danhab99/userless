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
import { useState } from "react";
import { InfiniteScroll } from "./InfiniteScroll";

type ThreadCardProps = {
  thread: ThreadForThreadCard;
  enableReplies?: boolean;
};

const ThreadCard = ({ thread, enableReplies }: ThreadCardProps) => {
  "use client";
  const [ReplyTB, showReply] = useToggleButton(false);
  const [SourceTB, showSource] = useToggleButton(false);
  const [FullTB, showFull] = useToggleButton(false);

  const master = useMasterKey();

  const policy = useAsyncRetry(async () => {
    if (master) {
      const resp = await fetch(`/t/${thread.hash}/policy`);
      const policyTxt = await resp.text();
      return JSON.parse(policyTxt) as ThreadPolicy;
    }
  }, [master, thread]);

  const change = async (newPolicy: Partial<ThreadPolicy>) => {
    if (master) {
      const packet = await openpgp.sign({
        message: await openpgp.createCleartextMessage({
          text: JSON.stringify(newPolicy),
        }),
        signingKeys: [master],
      });

      const resp = await fetch(`/t/${thread.hash}/policy`, {
        method: "PATCH",
        body: packet,
      });

      await new Promise((r) => setTimeout(r, 50));

      policy.retry();

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
      acceptsReplies: !thread.policy.acceptsReplies,
    });
  });

  const controls = (
    <div className="text-xs">
      {thread.policy.acceptsReplies ? (
        <ReplyTB trueLabel="Hide reply" falseLabel="Reply" />
      ) : null}
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
                : thread.policy.acceptsReplies
                  ? "Disable replies"
                  : "Enable replies"
            }
            onClick={disableReplies}
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
      {enableReplies ? (
        <InfiniteScroll replyTo={thread.hash} start={0} />
      ) : null}
    </>
  );
};

export default ThreadCard;
