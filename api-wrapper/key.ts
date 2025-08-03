import { createBaseFetcher } from "./fetch";
import { createThread, Thread } from "./thread";
import { parse } from "smol-toml";

export interface PublicKey {
  keyId: string;
  url: string;
  getArmored: () => Promise<string>;
  getThreads: (skip?: number, take?: number) => Promise<Thread[]>;
  getFiles: () => Promise<string[]>;
  getPolicy: () => Promise<any>;
}

export function createPublicKey(url: string, keyId: string): PublicKey {
  const baseFetcher = createBaseFetcher(url, `key/${keyId}`);

  return {
    keyId,
    url,
    async getArmored() {
      return baseFetcher.fetchFrom("");
    },

    async getThreads(skip?: number, take?: number) {
      const threadHashes = await baseFetcher.fetchFrom("threads", {
        skip,
        take,
      });
      const hashs = threadHashes.split("\n").filter((x) => x);
      return hashs.map((hash) => createThread(url, hash));
    },

    async getFiles(): Promise<string[]> {
      const resp = await baseFetcher.fetchFrom("files");
      return resp.split("\n");
    },

    async getPolicy() {
      return parse(await baseFetcher.fetchFrom("policy"));
    },
  };
}
