"use server";
import ThreadCard from "./ThreadCard";
import { PrismaClient } from "@prisma/client";
import { includes } from "@/lib/db";
import { ReplyHashNotifier } from "./InfiniteScroll";

export type ReplyListProps = {
  replyTo: string;
  start: number;
  max?: number
};

const db = new PrismaClient();

export async function ReplyList(props: ReplyListProps) {
  const threads = await db.thread.findMany({
    where: {
      replyTo: props.replyTo,
    },
    ...includes,
    skip: props.start,
    take: Math.min(props.max ?? 100, 100),
  });

  return (
    <>
      {threads.map((thread) => (
        <div key={thread.hash} className="py-px">
          <ThreadCard thread={thread} />
          <ReplyHashNotifier hash={thread.hash} />
        </div>
      ))}
    </>
  );
}
