"use server";
import { server } from "@/lib/userless";
import { ThreadCard, ThreadCardProps } from "./ThreadCard";

type ThreadCardFromHashProps = Omit<ThreadCardProps, "threadText"> & {
  hash: string;
  replies?: number;
};

export async function ThreadCardFromHash(props: ThreadCardFromHashProps) {
  const thread = await (await server.getThread(props.hash)).getPopulated();
  const replies = props.replies
    ? await thread.getReplies(0, props.replies)
    : [];

  console.log("ThreadCardFromHash", { thread, replies });

  return (
    <>
      <ThreadCard threadText={thread.content} {...props} />
      {replies ? (
        <div className="pr-6 pt-3">
          {replies.map((thread, i) => (
            <ThreadCardFromHash hash={thread.hash} key={i} />
          ))}
        </div>
      ) : null}
    </>
  );
}
