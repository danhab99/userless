"use server";
import { getServer } from "@/lib/userless";
import { ThreadCard } from "./ThreadCard";
import * as openpgp from "openpgp";
import { spoofArmoredSignature } from "@/lib/utils";

type ThreadCardFromHashProps = {
  hash: string;
  replies?: number;
};

export async function ThreadCardFromHash(props: ThreadCardFromHashProps) {
  if (!props.hash) {
    return <h1>Missing hash</h1>;
  }

  const server = await getServer();
  const thread = server.getThread(props.hash);
  
  // Resolve the actual hash if this is a ref
  const actualHash = await thread.resolveHash();

  const replies = props.replies
    ? await thread.getReplies(0, props.replies)
    : [];

  const threadText = await thread.getContent();

  const msg = await openpgp.readCleartextMessage({
    cleartextMessage: threadText.original,
  });

  const keyResp = await server
    .getKey(msg.getSigningKeyIDs()[0].toHex())
    .getArmored();

  const pk = await openpgp.readKey({
    armoredKey: keyResp,
  });

  const userId = (await pk.getPrimaryUser()).user.userID;

  const sig = spoofArmoredSignature(threadText.original);

  const signature = await openpgp.readSignature({
    armoredSignature: sig,
  });

  const body = msg.getText();
  const signedBy = {
    ...userId,
    finger: pk.getFingerprint(),
  };
  const timestamp = signature.packets[0].created;

  return (
    <>
      <ThreadCard
        {...props}
        threadText={threadText.original}
        body={body}
        hash={actualHash}
        signedBy={signedBy}
        timestamp={timestamp}
      />
      {replies ? (
        <div className="pr-6 pt-3">
          {replies
            .filter((x) => x)
            .map((thread, i) => (
              <ThreadCardFromHash {...props} hash={thread.hash} key={i} />
            ))}
        </div>
      ) : null}
    </>
  );
}
