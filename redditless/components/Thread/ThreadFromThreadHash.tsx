"use server";

import { getThreadTitle } from "@/lib/getThreadTitle";
import { getServer } from "@/lib/userless";
import openpgp from "openpgp";
import { Thread } from "./Thread";
import { CommentProps } from "../Comment/Comment";

export type ThreadFromThreadHashProps = {
  hash: string;
};

export async function ThreadFromThreadHash(props: ThreadFromThreadHashProps) {
  const server = getServer();

  let resolvedThread = await server.resolveThread(props.hash);

  const content = await resolvedThread.getContent();
  const [title, body] = getThreadTitle(content.body);

  const ownerArmoredKey = await resolvedThread.getOwner();

  const ownerKey = await openpgp.readKey({
    armoredKey: ownerArmoredKey,
  });

  const owner = (await ownerKey.getPrimaryUser()).user.userID;

  // Extract timestamp from signature
  let threadTimestamp = Date.now(); // fallback
  try {
    // If content has signature information, try to extract creation time
    if (content.signature) {
      const signature = await openpgp.readSignature({ armoredSignature: content.signature });
      const packets = signature.packets;
      for (const packet of packets) {
        if (packet.created) {
          threadTimestamp = packet.created.getTime();
          break;
        }
      }
    } else if (content.armored) {
      // If the content itself is armored (signed message), parse it
      const message = await openpgp.readMessage({ armoredMessage: content.armored });
      const packets = message.packets;
      for (const packet of packets) {
        if (packet.created) {
          threadTimestamp = packet.created.getTime();
          break;
        }
      }
    }
  } catch (error) {
    console.warn('Failed to extract timestamp from signature, using current time:', error);
  }

  // Get replies and convert them to CommentProps
  const threadReplies = await resolvedThread.getReplies();

  const replies = await Promise.all(
    threadReplies.map(async (reply) => {
      const replyThread = await server.resolveThread(reply.hash);
      const replyContent = await replyThread.getContent();
      const replyOwnerArmoredKey = await replyThread.getOwner();
      const replyOwnerKey = await openpgp.readKey({
        armoredKey: replyOwnerArmoredKey,
      });
      const replyOwner = (await replyOwnerKey.getPrimaryUser()).user.userID;

      // Extract timestamp from reply signature  
      let replyTimestamp = Date.now(); // fallback
      try {
        if (replyContent.signature) {
          const signature = await openpgp.readSignature({ armoredSignature: replyContent.signature });
          const packets = signature.packets;
          for (const packet of packets) {
            if (packet.created) {
              replyTimestamp = packet.created.getTime();
              break;
            }
          }
        } else if (replyContent.armored) {
          const message = await openpgp.readMessage({ armoredMessage: replyContent.armored });
          const packets = message.packets;
          for (const packet of packets) {
            if (packet.created) {
              replyTimestamp = packet.created.getTime();
              break;
            }
          }
        }
      } catch (error) {
        console.warn('Failed to extract timestamp from reply signature:', error);
      }

      return {
        body: replyContent.body,
        hash: reply.hash,
        ownerEmail: replyOwner?.email || "",
        ownerName: replyOwner?.name || "Anonymous",
        timestamp: replyTimestamp,
        enableDelete: false, // TODO: Implement proper delete permissions
        replies: [], // TODO: Implement nested replies if needed
        onDelete: () => {}, // TODO: Implement delete functionality
      };
    }),
  );

  return (
    <Thread
      body={body}
      hash={props.hash}
      ownerEmail={owner?.email || ""}
      ownerName={owner?.name || "Anonymous"}
      replies={replies}
      timestamp={threadTimestamp}
      enableDelete={false} // TODO: Implement proper delete permissions
      onDelete={() => {}} // TODO: Implement delete functionality
    />
  );
}
