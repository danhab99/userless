"use client";
import SigVerify from "../SigVerify/SigVerify";
import mailto from "mailto-link";
import ThreadBody from "../ThreadBody/ThreadBody";
import PostThread from "../PostThread/PostThread";
import { MakeToggleButton } from "../ToggleButton/ToggleButton";
import { Thread, Prisma } from "@prisma/client";
import Link from "next/link";
import { ThreadForThreadCard } from "@/global";

type ThreadCardProps = {
  thread: ThreadForThreadCard;
};

const ThreadCard = ({ thread }: ThreadCardProps) => {
  const [ReplyTB, showReply] = MakeToggleButton(false);
  const [SourceTB, showSource] = MakeToggleButton(false);
  const [FullTB, showFull] = MakeToggleButton(false);

  const mailtoLink = mailto({
    to: thread.signedBy.email,
    subject: `RE: https://${window.location.hostname}/t/${thread.hash}`,
    body: `Hello ${thread.signedBy.name},

In response to your thread https://${window.location.hostname}/t/${thread.hash}`,
  });

  function Controls() {
    return (
      <div className="text-xs">
        <ReplyTB trueLabel="Hide reply" falseLabel="Reply" />
        <SourceTB trueLabel="Hide source" falseLabel="Source" />
        <FullTB trueLabel="Less" falseLabel="More" />
      </div>
    );
  }

  return (
    <div className="card my-2 max-w-4xl bg-card p-4">
      <p className="text-sm">
        <span className="text-green-700">
          {new Date(thread.timestamp).toLocaleString()}
        </span>{" "}
        <span className="text-username">
          {thread.signedBy.name}
          <Link
            href={{
              pathname: "/k/[keyid]",
              query: {
                keyid: thread.signedBy.keyId,
              },
            }}
          >
            {"("}
            {thread.signedBy.keyId}
            {")"}
          </Link>
          <a href={mailtoLink} target="_blank">
            {"<"}
            {thread.signedBy.email}
            {">"}
          </a>
        </span>{" "}
        <Link
          className="text-slate-600"
          href={{
            pathname: "/t/[hash]",
            query: thread.hash,
          }}
        >
          {thread.hash.slice(0, 16)}
        </Link>{" "}
        <SigVerify thread={thread as Thread} />
      </p>
      <Controls />
      <div className={showFull ? "h-full" : "max-h-96 overflow-y-auto"}>
        <ThreadBody thread={thread as Thread} />
      </div>
      <Controls />o
      {showReply ? (
        <div className="pt-4">
          <PostThread replyTo={thread} />
        </div>
      ) : null}
      {showSource ? (
        <pre className="h-40 overflow-auto bg-slate-900 text-xs text-slate-100">
          {thread.body}
        </pre>
      ) : null}
    </div>
  );
};

export default ThreadCard;
