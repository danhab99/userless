import { getServer } from "./userless";

export type ThreadProps = {
  ownerEmail: string;
  ownerName: string;
  ownerFingerprint: string;

  timestamp: number;
  body: string;
  hash: string;
};

export async function getThreadProps(hash: string): Promise<ThreadProps> {
  const server = getServer();
  const resolvedThread = await server.resolveThread(server.thread(hash));

  const owner = await resolvedThread.getOwner();

  const content = await resolvedThread.getContent();

  const r = {
    ownerEmail: owner.email,
    ownerName: owner.name,
    ownerFingerprint: owner.fingerprint,

    timestamp: owner.timestamp.getTime(),
    body: content.body,
    hash: hash,
  };

  return r;
}

export async function getThreadReplyProps(
  hash: string,
): Promise<ThreadProps[]> {
  const server = getServer();
  const resolvedThread = await server.resolveThread(server.thread(hash));

  const replies = await resolvedThread.getReplies();

  return Promise.all(replies.map((x) => getThreadProps(x.hash)));
}
