import { ThreadCardFromHash } from "@/components/ThreadCard/ThreadCardServer";
import { server } from "@/lib/userless";
import { Thread } from "api-wrapper";

type ThreadPageProps = {
  params: Promise<{
    hash: string;
  }>;
};

const ThreadPage = async (props: ThreadPageProps) => {
  const params = await props.params;
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
      <div className="flex flex-col">
        {parents.map((hash, i) => (
          <ThreadCardFromHash key={i} hash={hash} />
        ))}
      </div>

      {parents.length > 0 ? <hr /> : null}

      <ThreadCardFromHash hash={params.hash} />

      <div className="md:pl-6 md:border-0 border-t border-gray-100">
        {replies.map((hash, i) => (
          <ThreadCardFromHash key={i} hash={hash} />
        ))}
      </div>
    </>
  );
};

export default ThreadPage;

export async function generateMetadata(props: ThreadPageProps): Promise<Metadata> {
  const params = await props.params;
  const thread: ThreadForThreadCard | null = await getThread(params.hash);
  if (!thread) {
    notFound();
  }

  return {
    title: `${thread.hash.slice(0, 8)} by ${thread.signedBy.name}`,
    authors: [
      {
        name: thread.signedBy.name,
        url: `/k/${thread.signedBy.finger}`,
      },
    ],
    robots: "index, follow",
  };
}
