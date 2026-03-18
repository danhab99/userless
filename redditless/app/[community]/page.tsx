import { createClient, getBanner } from "api-wrapper/userless";
import { ThreadList } from "@/components/ThreadList/ThreadList";
import type { Metadata, ResolvingMetadata } from "next";
import { ThreadListItemProps } from "@/components/ThreadListItem/ThreadListItem";

export async function generateMetadata(
  { params }: { params: Promise<{ community: string }> },
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const { community } = await params;

  return {
    title: `${community}`,
    description: `Community thread at ${community}`,
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ community: string }>;
}) {
  const { community } = await params;

  const server = createClient(process.env["NEXT_PUBLIC_USERLESS_URL"] || "");

  // Fetch the banner to get advertised threads for this community
  const banner = await server.getBanner();

  // Get advertised threads from banner.info.threads.frontpage or community-specific
  const frontpageThreads = banner.info?.threads?.frontpage || [];

  // Create thread list items for each advertised thread
  const threads: ThreadListItemProps[] = frontpageThreads.map(
    (threadRef: any) => ({
      ownerEmail: "",
      ownerName: "",
      timestamp: new Date().getTime(),
      body: threadRef.body || "",
      hash: threadRef.hash,
      enableDelete: false,
      replies: [],
    }),
  );

  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-6">{community}</h1>

      {threads.length === 0 ? (
        <p>No advertised threads available for {community}.</p>
      ) : (
        <ThreadList threads={threads} />
      )}
    </div>
  );
}
