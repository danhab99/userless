"use server";
import { Community } from "./Community";
import { useCommunityData } from "./useCommunityData";
import type { ThreadListItemProps } from "../ThreadListItem/ThreadListItem";

export interface CommunityServerProps {
  hash: string;
}

export async function CommunityServer(props: CommunityServerProps): Promise<React.JSX.Element> {
  const data = await useCommunityData(props.hash);
  
  // Convert replies to ThreadListItemProps format
  const threads: ThreadListItemProps[] = data.replies.map((reply, index) => ({
    ownerEmail: "", // Will be populated from reply data
    ownerName: "", // Will be populated from reply data
    timestamp: reply.timestamp.getTime(),
    body: reply.body,
    hash: reply.hash,
    enableDelete: false,
    replies: [], // Nested replies would need recursive fetching
  }));

  return (
    <Community
      ownerEmail={data.thread.ownerEmail}
      ownerName={data.thread.ownerName}
      timestamp={data.thread.timestamp.getTime()}
      body={data.content.body}
      hash={data.thread.hash}
      threads={threads}
    />
  );
}
