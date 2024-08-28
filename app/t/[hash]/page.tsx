import ThreadCard from "@/components/ThreadCard";
import { ThreadForThreadCard } from "@/global";
import { getParents, getReplies, getThread } from "@/lib/db";
import { Metadata } from "next";
import { notFound } from "next/navigation";

type ThreadPageProps = {
  params: {
    hash: string;
  };
};

const ThreadPage = async ({ params }: ThreadPageProps) => {
  const thread = await getThread(params.hash.toLowerCase());
  if (!thread) {
    notFound();
  }

  const [replies, parents] = await Promise.all([
    getReplies(params.hash.toLowerCase()),
    getParents(params.hash.toLowerCase()),
  ]);

  return (
    <>
      <div className="flex flex-col-reverse">
        {parents.map((thread, i) => (
          <ThreadCard key={i} thread={thread} />
        ))}
      </div>

      {parents.length > 0 ? <hr /> : null}

      <ThreadCard thread={thread} />

      <div className="pl-6">
        {replies.map((thread, i) => (
          <ThreadCard key={i} thread={thread} />
        ))}
      </div>
    </>
  );
};

export default ThreadPage;

export async function generateMetadata({
  params,
}: ThreadPageProps): Promise<Metadata> {
  const thread: ThreadForThreadCard | null = await getThread(params.hash);
  if (!thread) {
    notFound();
  }

  return {
    title: `${thread.hash} by ${thread.signedBy.name}`,
    authors: [
      {
        name: thread.signedBy.name,
        url: `/k/${thread.signedBy.finger}`,
      },
    ],
    robots: "index, follow",
  };
}
