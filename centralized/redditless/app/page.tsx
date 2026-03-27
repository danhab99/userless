import { createClient, getBanner } from "api-wrapper";
import { ThreadList } from "@/components/ThreadList/ThreadList";
import type { Metadata } from "next";
import { ThreadListItemProps } from "@/components/ThreadListItem/ThreadListItem";
import { getThreadProps } from "@/lib/thread";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Userless Frontpage",
    description: "Browse advertised threads",
  };
}

export default async function Page() {
  const serverUrl = process.env["NEXT_PUBLIC_USERLESS_URL"] || "http://localhost:8080";
  
  const server = createClient(serverUrl);

  // Fetch the banner to get advertised threads
  const banner = await server.getBanner();

  // Get advertised threads from banner.info.threads.frontpage
  const frontpageThreads = banner.info?.threads?.frontpage || [];

  // Create thread list items for each advertised thread
  const threads: ThreadListItemProps[] = await Promise.all(
    frontpageThreads.map((threadRef: string) => {
      return getThreadProps(threadRef);
    })
  );

  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-6">Frontpage</h1>

      {threads.length === 0 ? (
        <p>No advertised threads available.</p>
      ) : (
        <ThreadList threads={threads} />
      )}
    </div>
  );
}
