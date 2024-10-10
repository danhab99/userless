import { PrismaClient } from "@prisma/client";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import Markdown from "react-markdown";
import { getThreadsForThreadGroup } from "@/lib/db";
import { ThreadGroup } from "@/components/ThreadGroup";
import Centered from "@/components/Centered";
import * as openpgp from "openpgp";

const db = new PrismaClient();

type KeyPageParams = {
  params: {
    keyId: string;
  };
};

const KeyPage = async ({ params }: KeyPageParams) => {
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
    armoredKey: publicKey.armoredKey,
  });

  const timestamp = pk.getCreationTime();
  const threads = await threadsPromise;

  return (
    <>
      <Centered>
        <div className="px-4 pt-8 md:w-full sm:w-full">
          <div className="bg-yellow-100 shadow-lg w-full">
            <div className="p-2 text-center">
              <h3 className="">
                {publicKey.name} {"<"}
                {publicKey.email}
                {">"}
              </h3>
              <p className="text-sm text-slate-700">
                Created {timestamp.toLocaleString()}
              </p>
            </div>
            <div className="pt-2 w-full">
              <div className="markdown no-scrollbar">
                <Markdown>{publicKey.comment}</Markdown>
              </div>
            </div>
            <pre className="h-40 w-full overflow-auto bg-slate-300 p-1 text-xs w-full">
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
      finger: params.keyId,
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
