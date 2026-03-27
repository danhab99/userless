import type { Metadata, ResolvingMetadata } from "next";
import { CommunityServer } from "@/components/Community/CommunityServer";
import { ThreadFromThreadHash } from "@/components/Thread/ThreadFromThreadHash";

export async function generateMetadata(
  { params }: { params: Promise<{ hash_or_ref: string }> },
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const { hash_or_ref } = await params;

  return {
    title: `${hash_or_ref}`,
    description: `Community thread at ${hash_or_ref}`,
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ hash_or_ref: string }>;
}) {
  const { hash_or_ref } = await params;

  return (
    <div className="p-4">
      {hash_or_ref.length == 64 ? (
        <ThreadFromThreadHash hash={hash_or_ref} />
      ) : (
        <CommunityServer hash={hash_or_ref} />
      )}
    </div>
  );
}
