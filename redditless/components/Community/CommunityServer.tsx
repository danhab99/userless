"use server";
import { Community } from "./Community";
import { getThreadProps, getThreadReplyProps } from "@/lib/thread";

export interface CommunityServerProps {
  hash: string;
}

export async function CommunityServer(
  props: CommunityServerProps,
): Promise<React.JSX.Element> {
  const thread = await getThreadProps(props.hash);
  const replies = await getThreadReplyProps(props.hash);

  return <Community {...thread} threads={replies} />;
}
