"user server";
import ThreadCard from "./ThreadCard";
import { PrismaClient } from "@prisma/client";
import { includes } from "@/lib/db";

const db = new PrismaClient();

type ThreadCardFromHashProps = {
  hash: string;
};

export async function ThreadCardFromHash(props: ThreadCardFromHashProps) {
  const thread = await db.thread.findUnique({
    where: {
      hash: props.hash,
    },
    ...includes,
  });

  if (thread) {
    return <ThreadCard thread={thread} />;
  } else {
    return <h1 className="font-bold text-lg">404; Thread not found</h1>;
  }
}
