import { PostThread } from "@/components/PostThread/PostThread";
import { server } from "@/lib/userless";
import ThreadBody from "@/components/ThreadBody/ThreadBody";
import { ThreadCardFromHash } from "@/components/ThreadCard/ThreadCardServer";

import { CenteredLayout } from "@/layouts/centered";

const WelcomePage = async () => {
  const banner = await server.getBanner();

  return (
    <>
      <CenteredLayout>
        <div className="text-gray-800">
          <ThreadBody body={banner.body} />
        </div>
        <PostThread />
      </CenteredLayout>

      {banner.info["threads"].map((hash: string, i: number) => (
        <ThreadCardFromHash key={i} hash={hash} replies={3} />
      ))}
    </>
  );
};

export default WelcomePage;
