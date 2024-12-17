import { BaseFetcher } from "./fetch";
import { Thread } from "./thread";
import { parse } from "smol-toml";

export class PublicKey extends BaseFetcher {
  readonly armored: string;
  readonly keyId: string;

  constructor(url: string, keyId: string, armored: string) {
    super(url, `key/${keyId}`);
    this.keyId = keyId;
    this.armored = armored;
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
    return hashs.map((hash) => new Thread(this.url, hash, ""));
  }

  public async getPolicy() {
    return parse(await this.fetchFrom("policy"))
  }
}
