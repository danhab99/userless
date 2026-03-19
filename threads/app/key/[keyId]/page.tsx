"use server";
import { Metadata } from "next";
import Markdown from "react-markdown";
import Centered from "@/components/Centered/Centered";
import * as openpgp from "openpgp";
import { ThreadCardFromHash } from "@/components/ThreadCard/ThreadCardServer";
import { getServer } from "ui-components";
import { ResolvedThread } from "api-wrapper";

type KeyPageParams = {
  params: Promise<{
    keyId: string;
    page: number
  }>;
};

const collectInfo = async (params: Awaited<KeyPageParams["params"]>): Promise<{
  user: openpgp.UserIDPacket,
  timestamp: Date,
  armored: string,
  threads: ResolvedThread[],
}> => {
  const server = getServer();

  const publickey = server.getKey(params.keyId.toLowerCase());

  const armored = await publickey.getArmored()

  const pk = await openpgp.readKey({
    armoredKey: armored,
  });

  const timestamp = pk.getCreationTime();

  const threads = await publickey.getThreads();

  threads.map(thread => server.resolveThread(thread))

  const user = (await pk.getPrimaryUser()).user.userID!;
  return { user, timestamp, armored, threads };
}

const KeyPage = async ({ params }: KeyPageParams) => {
  const { user, timestamp, armored, threads } = await collectInfo(await params);
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
        <ThreadCardFromHash key={i} hash={thread} />
      ))}
    </>
  );
};

export default KeyPage;

export async function generateMetadata(props: KeyPageParams): Promise<Metadata> {
  const { user } = await collectInfo(await props.params);
  return {
    title: `${user?.name}<${user?.email}>`,
    robots: "index, follow",
  };
}
