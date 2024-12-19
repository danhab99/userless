import { PostThreadNarrow } from "@/components/PostThread/PostThread";
import { server } from "@/lib/userless";
import ThreadBody from "@/components/ThreadBody/ThreadBody";
import { ThreadCardFromHash } from "@/components/ThreadCard/ThreadCardServer";

const WelcomePage = async () => {
  const banner = await server.getBanner();

  return (
    <>
      <h1 className="text-2xl w-full text-center text-gray-900 tracking-wide font-semibold">
        userless.xyz
      </h1>

      <ThreadBody body={banner.body} />

      <PostThreadNarrow />

      {banner.info["threads"].map((hash: string, i: number) => (
        <ThreadCardFromHash key={i} hash={hash} replies={3} />
      ))}
    </>
  );
};

export default WelcomePage;
