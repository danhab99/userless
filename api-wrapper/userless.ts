import { Fetcher } from "./fetch";
import { Banner } from "./types";
import { Thread } from "./thread";
import { PublicKey } from "./key";
import { DELIMITER } from "./const";
import { parse } from "smol-toml";
import { debug } from "./debug";

export class UserlessServer extends Fetcher {
  constructor(url: string) {
    super(url);
    debug("new server", url);
  }

  public async getBanner(): Promise<Banner> {
    const ret = await this.fetch("/");
    debug("get banner");
    const [body, info] = ret.split(DELIMITER, 2);
    return { body, info: parse(info) };
  }

  public async getThread(hash: string): Promise<Thread> {
    debug("get thread", hash);
    const resp = await this.fetch(`/thread/${hash}`);
    return new Thread(this.url, hash, resp);
  }

  public async getKey(keyId: string): Promise<PublicKey> {
    debug("get publickey", keyId);
    const resp = await this.fetch(`/key/${keyId}`);
    return new PublicKey(this.url, keyId, resp);
  }
}
