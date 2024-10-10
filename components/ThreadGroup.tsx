"use client";
import type { ThreadForThreadGroup } from "@/lib/db";
import { useToggleButton } from "./ToggleButton";
import ThreadCard from "./ThreadCard";
import { InfiniteScroll } from "./InfiniteScroll";

export function ThreadGroup({ thread }: { thread: ThreadForThreadGroup }) {
  const [ShowRepliesButton, showReplies] = useToggleButton(false);

  return (
    <div className="py-4">
      {thread.parent ? <ThreadCard thread={thread.parent} /> : null}

      <div className={thread.parent ? "pl-6" : ""}>
        <ThreadCard thread={thread} />
        <span className="text-xs">
          {thread.replies.length > 0 ? (
            <ShowRepliesButton
              falseLabel="Show replies"
              trueLabel="Hide replies"
            />
          ) : null}
        </span>

        {showReplies ? (
          <div className="pl-6">
            <InfiniteScroll replyTo={thread.hash} start={10} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
