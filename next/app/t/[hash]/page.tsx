import ThreadCard from "@/components/ThreadCard/ThreadCard";
import { getParents, getReplies, getThread } from "@/lib/db";

type ThreadPageProps = {
  params: {
    hash: string;
  };
};

const ThreadPage = async ({ params }: ThreadPageProps) => {
  const thread = await getThread(params.hash);
  if (!thread) {
    throw "didnt find thread";
  }

  const [replies, parents] = await Promise.all([
    getReplies(params.hash),
    getParents(params.hash),
  ]);

  return (
    <>
      {parents.map((thread, i) => (
        <ThreadCard key={i} thread={thread} />
      ))}

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
