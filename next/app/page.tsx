import { PrismaClient } from "@prisma/client";
import ThreadCard from "@/components/ThreadCard/ThreadCard";
import { includes } from "@/db";
import PostThread from "@/components/PostThread/PostThread";

const db = new PrismaClient();

const WelcomePage = async () => {
  const threads = await db.thread.findMany({
    where: {
      replyTo: null,
    },
    ...includes,
  });

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

      {threads.map((thread) => (
        <ThreadCard thread={thread} />
      ))}
    </>
  );
};

export default WelcomePage;
