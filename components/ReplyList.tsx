"use server";
import ThreadCard from "./ThreadCard";
import { PrismaClient } from "@prisma/client";
import { includes } from "@/lib/db";
import { ReplyHashNotifier } from "./InfiniteScroll";
import { ThreadGroup } from "./ThreadGroup";

export type ReplyListProps = {
  replyTo: string;
  start: number;
  max?: number;
};

const db = new PrismaClient();

export async function ReplyList(props: ReplyListProps) {
  const threads = await db.thread.findMany({
    where: {
      replyTo: props.replyTo,
    },
    include: {
      ...includes.include,
      parent: {
        ...includes,
      },
      replies: {
        ...includes,
        take: 3,
        orderBy: {
          timestamp: "desc",
        },
      },
    },
    skip: props.start,
    take: Math.min(props.max ?? 100, 100),
  });

  return (
    <>
      {threads.map((thread) => (
        <div key={thread.hash} className="py-px">
          <ThreadGroup thread={thread} />
          <ReplyHashNotifier hash={thread.hash} />
        </div>
      ))}
    </>
  );
}
