import type { Thread } from "./p2p";
import * as openpgp from "openpgp";

type ResolvedThread = {
  body: string;
  name: string;
  email: string;
  comment: string;
};

export async function parseThread(thread: Thread): Promise<ResolvedThread> {
  const msg = await openpgp.readCleartextMessage({
    cleartextMessage: thread.content
  });

  const body = msg.getText();

  return {
    body,
    name: "unknown",
    email: "",
    comment: "",
  };
}
