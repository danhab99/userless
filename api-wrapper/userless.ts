import { createFetcher } from "./fetch";
import { Banner } from "./types";
import { createThread } from "./thread";
import { createPublicKey } from "./key";
import { DELIMITER } from "./const";
import { parse } from "smol-toml";
import { debug } from "./debug";

export interface UserlessServer {
  getBanner: () => Promise<Banner>;
  getThread: (hash: string) => any;
  getKey: (keyId: string) => any;
}

export function createUserlessServer(url: string): UserlessServer {
  const fetcher = createFetcher(url);
  debug("new server", url);

  return {
    async getBanner(): Promise<Banner> {
      const ret = await fetcher.fetch("/");
      debug("get banner");
      const [body, info] = ret.split(DELIMITER, 2);
      return { body, info: parse(info) };
    },

    getThread(hash: string) {
      return createThread(url, hash);
    },

    getKey(keyId: string) {
      return createPublicKey(url, keyId);
    }
  };
}