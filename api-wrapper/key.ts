import { BaseFetcher } from "./fetch";
import { Thread } from "./thread";
import { parse } from "smol-toml";

export class PublicKey extends BaseFetcher {
  readonly keyId: string;

  constructor(url: string, keyId: string) {
    super(url, `key/${keyId}`);
    this.keyId = keyId;
  }

  public async getArmored() {
    return this.fetchFrom("");
  }

  public async getThreads(skip?: number, take?: number) {
    const threaHashes = await this.fetchFrom("threads", {
      skip: `${skip}`,
      take: `${take}`,
    });
    const hashs = threaHashes.split("\n");
    return hashs.map((hash) => new Thread(this.url, hash));
  }

  public async getFiles(): Promise<string[]> {
    const resp = await this.fetchFrom("files");
    return resp.split("\n")
  }

  public async getPolicy() {
    return parse(await this.fetchFrom("policy"));
  }
}
