"use client";
import SigVerify from "@/components/SigVerify";
import mailto from "mailto-link";
import ThreadBody from "@/components/ThreadBody";
import { PostThread } from "@/components/PostThread";
import { MakeToggleButton } from "@/components/ToggleButton";
import { Thread } from "@prisma/client";
import Link from "next/link";
import { ThreadForThreadCard } from "@/global";

type ThreadCardProps = {
  thread: ThreadForThreadCard;
};

const ThreadCard = ({ thread }: ThreadCardProps) => {
  "use client";
  const [ReplyTB, showReply] = MakeToggleButton(false);
  const [SourceTB, showSource] = MakeToggleButton(false);
  const [FullTB, showFull] = MakeToggleButton(false);


  const mailtoLink = mailto({
    to: thread.signedBy.email,
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
          <Link href={`/k/${thread.signedBy.keyId}`}>
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
          href={`/t/${ thread.hash }`}
        >
          {thread.hash.slice(0, 16)}
        </Link>{" "}
        <SigVerify thread={thread as Thread} />
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
