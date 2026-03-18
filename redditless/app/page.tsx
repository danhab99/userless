import { createClient, getBanner } from "api-wrapper/userless";
import { ThreadList } from "@/components/ThreadList/ThreadList";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Userless Frontpage",
    description: "Browse advertised threads",
  };
}

export default async function Page() {
  const server = createClient(process.env["NEXT_PUBLIC_USERLESS_URL"] || "");
  
  // Fetch the banner to get advertised threads
  const banner = await server.getBanner();
  
  // Get advertised threads from banner.info.threads.frontpage
  const frontpageThreads = banner.info?.threads?.frontpage || [];
  
  // Create thread list items for each advertised thread
  const threads: ThreadListItemProps[] = frontpageThreads.map((threadRef: any) => ({
    ownerEmail: "",
    ownerName: "",
    timestamp: new Date().getTime(),
    body: threadRef.body || "",
    hash: threadRef.hash,
    enableDelete: false,
    replies: [],
  }));

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
