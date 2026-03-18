"use server";

import { getThreadTitle } from "@/lib/getThreadTitle";
import { getServer } from "@/lib/userless";
import * as openpgp from "openpgp";
import { Thread } from "./Thread";
import { CommentProps } from "../Comment/Comment";
import { getThreadProps, getThreadReplyProps } from "@/lib/thread";

export type ThreadFromThreadHashProps = {
  hash: string;
};

export async function ThreadFromThreadHash(props: ThreadFromThreadHashProps) {
  const server = getServer();

  const thread = await getThreadProps(props.hash);
  const replies = await getThreadReplyProps(props.hash);

  return (
    <Thread
      {...thread}
      replies={replies}
      // body={body}
      // hash={props.hash}
      // ownerEmail={owner?.email || ""}
      // ownerName={owner?.name || "Anonymous"}
      // replies={replies}
      // timestamp={threadTimestamp}
      // enableDelete={false} // TODO: Implement proper delete permissions
      // onDelete={() => {}} // TODO: Implement delete functionality
    />
  );
}
