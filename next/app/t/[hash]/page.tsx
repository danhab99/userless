import ThreadCard from "@/components/ThreadCard/ThreadCard";
import { getParents, getReplies, getThread } from "@/db";

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
      {parents.map((thread) => (
        <ThreadCard thread={thread} />
      ))}
      <hr />

      <ThreadCard thread={thread} />

      <div className="pr-4">
        {replies.map((thread) => (
          <ThreadCard thread={thread} />
        ))}
      </div>
    </>
  );
};

export default ThreadPage;
