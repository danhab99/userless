import { createClient, resolveThread } from "api-wrapper/userless";
import type { Thread, Content } from "api-wrapper/types";

export interface CommunityData {
  thread: Thread;
  content: Content;
  replies: Thread[];
}

export async function useCommunityData(hash: string): Promise<CommunityData> {
  const server = createClient(process.env["NEXT_PUBLIC_USERLESS_URL"] || "");
  
  // Get the thread object
  const threadObj = server.thread(hash);
  
  // Resolve the thread to get full content and replies
  const resolvedThread = await resolveThread(threadObj);
  
  // Fetch all replies recursively if needed
  let allReplies: Thread[] = [];
  
  try {
    const initialReplies = await resolvedThread.getReplies();
    allReplies = initialReplies;
    
    // Optionally fetch parents if needed for community context
    const parents = await resolvedThread.getParents(1);
    allReplies = [...allReplies, ...parents];
  } catch (error) {
    console.error("Error fetching replies:", error);
  }
  
  return {
    thread: resolvedThread,
    content: await resolvedThread.getContent(),
    replies: allReplies,
  };
}

export async function useCommunityDataWithPagination(
  hash: string,
  skip?: number,
  take?: number
): Promise<CommunityData> {
  const server = createClient(process.env["NEXT_PUBLIC_USERLESS_URL"] || "");
  
  const threadObj = server.thread(hash);
  const resolvedThread = await resolveThread(threadObj);
  
  let allReplies: Thread[] = [];
  
  try {
    const initialReplies = await resolvedThread.getReplies(skip, take);
    allReplies = initialReplies;
    
    // Fetch parents for community context
    const parents = await resolvedThread.getParents(1);
    allReplies = [...allReplies, ...parents];
  } catch (error) {
    console.error("Error fetching replies:", error);
  }
  
  return {
    thread: resolvedThread,
    content: await resolvedThread.getContent(),
    replies: allReplies,
  };
}
