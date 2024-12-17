import { Fetcher } from "./fetch";
import { Banner } from "./types";
import { Content } from "./content";
import { Thread } from "./thread";
import {PublicKey} from "./key";

export class UserlessServer extends Fetcher {
  public async getBanner(): Promise<Banner> {
    const ret = await this.fetch("/");
    return new Content(ret) as Banner;
  }

  public async getThread(hash: string): Promise<Thread> {
    const resp = await this.fetch(`/thread/${hash}`);
    return new Thread(this.url, hash, resp);
  }

  public async getKey(keyId: string): Promise<PublicKey> {
    const resp = await this.fetch(`/key/${keyId}`)
    return new PublicKey(this.url, keyId, resp);
  }
}
