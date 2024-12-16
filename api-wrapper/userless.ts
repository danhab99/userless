import { Fetcher } from "./fetch";
import { Banner } from "./types";
import { Content } from "./content";

export class UserlessServer extends Fetcher {
  public async getBanner(): Promise<Banner> {
    const ret = await this.fetch("/");
    return new Content(ret) as Banner;
  }

  public async getThread(hash: string) {
    return this.fetch(`/thread/${hash}`);
  }
}
