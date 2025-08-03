import { PostThread } from "@/components/PostThread/PostThread";
import { getServer } from "@/lib/userless";
import ThreadBody from "@/components/ThreadBody/ThreadBody";
import { ThreadCardFromHash } from "@/components/ThreadCard/ThreadCardServer";

import { CenteredLayout } from "@/layouts/centered";

const WelcomePage = async () => {
  const server = await getServer();
  const banner = await server.getBanner();

  return (
    <>
      <CenteredLayout>
        <div className="text-gray-800">
          <ThreadBody body={banner.body} />
        </div>
        <PostThread />
      </CenteredLayout>

      {(banner.info["threads"].frontpage ?? []).map((hash: string, i: number) => (
        <ThreadCardFromHash key={i} hash={hash} replies={3} />
      ))}
    </>
  );
};

export default WelcomePage;
