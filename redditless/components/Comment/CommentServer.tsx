"use server";
import { Comment } from "./Comment";
import { useCommentData } from "./useCommentData";
import type { ThreadListItemProps } from "../ThreadListItem/ThreadListItem";

export interface CommentServerProps {
  hash: string;
}

export async function CommentServer(props: CommentServerProps): Promise<React.JSX.Element> {
  const data = await useCommentData(props.hash);
  
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
    <Comment
      ownerEmail={data.thread.ownerEmail}
      ownerName={data.thread.ownerName}
      timestamp={data.thread.timestamp.getTime()}
      body={data.content.body}
      hash={data.thread.hash}
      threads={threads}
    />
  );
}
