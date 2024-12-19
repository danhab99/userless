"use server";
import { server } from "@/lib/userless";
import { ThreadCard, ThreadCardProps } from "./ThreadCard";

type ThreadCardFromHashProps = Omit<ThreadCardProps, "threadText"> & {
  hash: string;
  replies?: number;
};

export async function ThreadCardFromHash(props: ThreadCardFromHashProps) {
  if (!props.hash) {
    return <h1>Missing hash</h1>;
  }

  const thread = server.getThread(props.hash);
  const replies = props.replies
    ? await thread.getReplies(0, props.replies)
    : [];

  const content = await thread.getContent();

  return (
    <>
      <ThreadCard threadText={content} {...props} />
      {replies ? (
        <div className="pr-6 pt-3">
          {replies
            .filter((x) => x)
            .map((thread, i) => (
              <ThreadCardFromHash hash={thread.hash} key={i} />
            ))}
        </div>
      ) : null}
    </>
  );
}
