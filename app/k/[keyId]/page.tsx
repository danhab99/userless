import ThreadCard from "@/components/ThreadCard";
import { PrismaClient } from "@prisma/client";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import Markdown from "react-markdown";
import { includes } from "@/lib/db";

type KeyPageParams = {
  params: {
    keyId: string;
  };
};

const db = new PrismaClient();

const KeyPage = async ({ params }: KeyPageParams) => {
  const publicKey = await db.publicKey.findUnique({
    where: {
      keyId: params.keyId,
    },
  });

  if (!publicKey) {
    notFound();
  }

  const threads = await db.thread.findMany({
    where: {
      signedBy: {
        keyId: params.keyId,
      },
    },
    ...includes,
  });

  return (
    <>
      <div className="px-4">
        <div className="flexflex-col items-center border border-black bg-yellow-100">
          <div className="p-2">
            <h3 className="text-center">
              {publicKey.name} {"<"}
              {publicKey.email}
              {">"}
            </h3>
            <p className="py-2">
              <div className="markdown">
                <Markdown>{publicKey.comment}</Markdown>
              </div>
            </p>
          </div>
          <pre className="h-40 w-full overflow-y-scroll bg-slate-300 p-1 text-xs">
            {publicKey.armoredKey}
          </pre>
        </div>
      </div>

      {threads.map((thread, i) => (
        <ThreadCard key={i} thread={thread} />
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
