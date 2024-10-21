import { PrismaClient } from "@prisma/client";
import ThreadCard from "@/components/ThreadCard";
import { includes } from "@/lib/db";
import { PostThreadNarrow } from "@/components/PostThread";

const db = new PrismaClient();

const WelcomePage = async () => {
  const threads = await db.thread.findMany({
    where: {
      replyTo: {
        isSet: false,
      },
      policy: {
        is: {
          visible: true,
          advertise: true,
        },
      },
    },
    ...includes,
    orderBy: {
      timestamp: "desc",
    },
  });

  return (
    <>
      <PostThreadNarrow />

      {threads.map((thread, i) => (
        <ThreadCard key={i} thread={thread} />
      ))}
    </>
  );
};

export default WelcomePage;
