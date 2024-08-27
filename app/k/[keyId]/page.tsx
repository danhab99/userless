import { PrismaClient } from "@prisma/client";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import Markdown from "react-markdown";
import { getThreadsForThreadGroup } from "@/lib/db";
import { ThreadGroup } from "@/components/ThreadGroup";
import Centered from "@/components/Centered";

const db = new PrismaClient();

type KeyPageParams = {
  params: {
    keyId: string;
  };
};

const KeyPage = async ({ params }: KeyPageParams) => {
  const publicKey = await db.publicKey.findUnique({
    where: {
      keyId: params.keyId,
    },
  });

  if (!publicKey) {
    notFound();
  }

  const threads = await getThreadsForThreadGroup(params.keyId);

  return (
    <>
      <Centered>
        <div className="px-4 pt-8">
          <div className="flexflex-col items-center bg-yellow-100">
            <div className="p-2">
              <h3 className="text-center">
                {publicKey.name} {"<"}
                {publicKey.email}
                {">"}
              </h3>
              <div className="pt-2">
                <div className="markdown no-scrollbar">
                  <Markdown>{publicKey.comment}</Markdown>
                </div>
              </div>
            </div>
            <pre className="h-40 w-full overflow-y-scroll bg-slate-300 p-1 text-xs">
              {publicKey.armoredKey}
            </pre>
          </div>
        </div>
      </Centered>

      {threads.map((thread, i) => (
        <ThreadGroup thread={thread} key={i} />
      ))}
    </>
  );
};

export default KeyPage;

export async function generateMetadata({
  params,
}: KeyPageParams): Promise<Metadata> {
  const publicKey = await db.publicKey.findUnique({
    where: {
      keyId: params.keyId,
    },
  });

  if (!publicKey) {
    notFound();
  }

  return {
    title: `${publicKey.name}<${publicKey.email}>`,
    robots: "index, follow",
  };
}
