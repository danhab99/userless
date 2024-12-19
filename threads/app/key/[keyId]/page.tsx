import { PrismaClient } from "@prisma/client";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import Markdown from "react-markdown";
import Centered from "@/components/Centered/Centered";
import * as openpgp from "openpgp";
import { ThreadCardFromHash } from "@/components/ThreadCard/ThreadCardServer";
import { server } from "@/lib/userless";

type KeyPageParams = {
  params: Promise<{
    keyId: string;
  }>;
};

const KeyPage = async (props: KeyPageParams) => {
  const params = await props.params;
  const publicKey = await db.publicKey.findUnique({
    where: {
      finger: params.keyId.toLowerCase(),
    },
  });

  if (!publicKey) {
    notFound();
  }

  const threadsPromise = getThreadsForThreadGroup(params.keyId);

  const pk = await openpgp.readKey({
    armoredKey: armored,
  });

  const timestamp = pk.getCreationTime();

  const user = (await pk.getPrimaryUser()).user.userID;
  return { user, timestamp, pk, armored, threads };
}

const KeyPage = async ({ params }: KeyPageParams) => {
  const { user, timestamp, armored, threads } = await collectInfo(params);
  return (
    <>
      <Centered>
        <div className="px-4 pt-8 md:w-full sm:w-full">
          <div className="bg-yellow-100 shadow-lg w-full">
            <div className="p-2 text-center">
              <h3 className="">
                {user?.name} {"<"}
                {user?.email}
                {">"}
              </h3>
              <p className="text-sm text-slate-700">
                Created {timestamp.toLocaleString()}
              </p>
            </div>
            <div className="pt-2 w-full">
              <div className="markdown no-scrollbar">
                <Markdown>{user?.comment}</Markdown>
              </div>
            </div>
            <pre className="h-40 w-full overflow-auto bg-slate-300 p-1 text-xs w-full">
              {armored}
            </pre>
          </div>
        </div>
      </Centered>

      {threads.map((thread, i) => (
        <ThreadCardFromHash key={i} hash={thread.hash} />
      ))}
    </>
  );
};

export default KeyPage;

export async function generateMetadata(props: KeyPageParams): Promise<Metadata> {
  const params = await props.params;
  const publicKey = await db.publicKey.findUnique({
    where: {
      finger: params.keyId,
    },
  });

  if (!publicKey) {
    notFound();
  }

  return {
    title: `${user?.name}<${user?.email}>`,
    robots: "index, follow",
  };
}
