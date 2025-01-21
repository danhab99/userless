import { createBaseFetcher } from "./fetch";
import { parse } from "smol-toml";
import { Info } from "./types";

export interface Thread {
  hash: string;
  getPolicy: () => Promise<Info>;
  getContent: () => Promise<string>;
  getReplies: (skip?: number, take?: number) => Promise<Thread[]>;
}

export function createThread(url: string, hash: string): Thread {
  const baseFetcher = createBaseFetcher(url, `thread/${hash}`);

  return {
    hash,
    async getPolicy(): Promise<Info> {
      return parse(await baseFetcher.fetchFrom("policy"));
    },

    async getContent(): Promise<string> {
      return baseFetcher.fetchFrom("");
    },

    async getReplies(skip = 0, take?: number): Promise<Thread[]> {
      const replies = await baseFetcher.fetchFrom("replies", { skip, take });

      const hashs = replies.split("\n").filter((x) => x);
      return hashs.map((hash) => createThread(url, hash));
    },
  };
}
