import { createBaseFetcher } from "./fetch";
import { parse } from "smol-toml";
import { Info } from "./types";
import { createContent, Content } from "./content"

export interface Thread {
  hash: string;
  getPolicy: () => Promise<Info>;
  getContent: () => Promise<Content>;
  getReplies: (skip?: number, take?: number) => Promise<Thread[]>;
  getParents: (count?: number) => Promise<Thread[]>;
}

export function createThread(url: string, hash: string): Thread {
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
  };
}
