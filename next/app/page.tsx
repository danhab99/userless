import { PrismaClient } from "@prisma/client";
import ThreadCard from "@/components/ThreadCard/ThreadCard";
import { includes } from "@/lib/db";
import PostThread from "@/components/PostThread/PostThread";
import {revalidatePath} from "next/cache";

const db = new PrismaClient();

const WelcomePage = async () => {
  const threads = await db.thread.findMany({
    where: {
      replyTo: {
        isSet: false
      },
    },
    ...includes,
  });

  console.log("threads", threads);

  return (
    <>
      <header className="p-8 text-center">
        <h1>PGChan.gpg</h1>
        <p>
          PGChan is an activity-pub compliant file board that uses GPG for role
          based access control.
        </p>
      </header>

      <PostThread />

      {threads.map((thread, i) => (
        <ThreadCard key={i} thread={thread} />
      ))}
    </>
  );
};

export default WelcomePage;
