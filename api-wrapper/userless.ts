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

  public getThread(hash: string): Thread {
    return new Thread(this.url, hash);
  }

  public getKey(keyId: string): PublicKey {
    return new PublicKey(this.url, keyId);
  }
}
