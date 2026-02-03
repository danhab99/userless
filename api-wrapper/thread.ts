import { createBaseFetcher, createFetcher } from "./fetch";
import { parse } from "smol-toml";
import { Info } from "./types";
import { createContent, Content } from "./content"
import { createPublicKey, PublicKey } from "./key";
import * as openpgp from "openpgp";

export interface Thread {
  hash: string;
  getPolicy: () => Promise<Info>;
  getContent: () => Promise<Content>;
  getReplies: (skip?: number, take?: number) => Promise<Thread[]>;
  getParents: (count?: number) => Promise<Thread[]>;
  getOwner: () => Promise<PublicKey>
}

export async function resolveThreadRef(url: string, ref: string) {
  const baseFetcher = createFetcher(url);
  baseFetcher.fetchWithRedirect(`thread/${hash}`)

}

export function createThread(url: string, hash: string): Thread {
  if (hash.length != 64) {
    throw "not a real hash"
  }
  const baseFetcher = createBaseFetcher(url, `thread/${hash}`);

  return {
    hash,
    async getPolicy(): Promise<Info> {
      return parse(await baseFetcher.fetchFrom("policy"));
    },

    async getContent(): Promise<Content> {
      return createContent(await baseFetcher.fetchFrom(""));
    },

    async getReplies(skip = 0, take?: number): Promise<Thread[]> {
      const replies = await baseFetcher.fetchFrom("replies", { skip, take });
      const hashs = replies.split("\n").filter((x) => x);
      return hashs.map((hash) => createThread(url, hash));
    },

    async getParents(count?: number): Promise<Thread[]> {
      const replies = await baseFetcher.fetchFrom("parents", { count });
      const hashs = replies.split("\n").filter((x) => x);
      return hashs.map((hash) => createThread(url, hash));
    },

    async getOwner(): Promise<PublicKey> {
      const content = await this.getContent()
      const msg = await openpgp.readCleartextMessage({
        cleartextMessage: content.original,
      })

      const owner = msg.getSigningKeyIDs()[0].toHex()
      return createPublicKey(url, owner)
    }
  };
}
