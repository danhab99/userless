"use server";
import { server } from "@/lib/userless";
import { ThreadCard, ThreadCardProps } from "./ThreadCard";

type ThreadCardFromHashProps = Omit<ThreadCardProps, "threadText"> & {
  hash: string;
};

export async function ThreadCardFromHash(props: ThreadCardFromHashProps) {
  const thread = await (await server.getThread(props.hash)).getPopulated();
  return <ThreadCard threadText={thread.content} {...props} />;
}
