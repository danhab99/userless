"use client";
import type { ThreadForThreadGroup } from "@/lib/db";
import { useToggleButton } from "./ToggleButton";
import ThreadCard from "./ThreadCard";
import { ThreadForThreadCard } from "@/global";

export function ThreadGroup({ thread }: { thread: ThreadForThreadGroup }) {
  const [ShowRepliesButton, showReplies] = useToggleButton(false);

  return (
    <div className="py-4">
      {thread.parent ? <ThreadCard thread={thread.parent} /> : null}
      {thread.parent ? <hr /> : null}

      <div className={thread.parent ? "pl-6" : ""}>
        <ThreadCard thread={thread} />
        <span className="text-xs">
          <ShowRepliesButton
            falseLabel="Show replies"
            trueLabel="Hide replies"
          />
        </span>
        {showReplies ? (
          <div className="pl-6">
            {thread.replies.map((thread: ThreadForThreadCard, i: number) => (
              <ThreadCard key={i} thread={thread} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
