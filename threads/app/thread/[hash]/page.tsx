import { ThreadCardFromHash } from "@/components/ThreadCard/ThreadCardServer";
import { server, Thread } from "@/lib/userless";
import { Metadata } from "next";
// import { Thread, getThread } from "api-wrapper";

type ThreadPageProps = {
  params: Promise<{
    hash: string;
  }>;
};

const ThreadPage = async (props: ThreadPageProps) => {
  const params = await props.params;

  const thread = await Thread.fetch(params.hash.toLowerCase())

  const [replies, parents] = await Promise.all([
    thread.getReplies(),
    thread.getParents(),
  ]);

  return (
    <>
      <div className="flex flex-col">
        {parents.map(({ hash }, i) => (
          <ThreadCardFromHash key={i} hash={hash} />
        ))}
      </div>

      {parents.length > 0 ? <hr /> : null}

      <ThreadCardFromHash hash={params.hash} />

      <div className="md:pl-6 md:border-0 border-t border-gray-100">
        {replies.map(({ hash }, i) => (
          <ThreadCardFromHash key={i} hash={hash} />
        ))}
      </div>
    </>
  );
};

export default ThreadPage;

export async function generateMetadata(props: ThreadPageProps): Promise<Metadata> {
  const params = await props.params;
  const thread = server.getThread(params.hash);

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
