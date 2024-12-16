import { BaseFetcher } from "./fetch";
import { parse } from "smol-toml";
import { Info } from "./types";

export class Thread extends BaseFetcher {
  readonly hash: string;
  public content: string;

  public constructor(url: string, hash: string, content: string) {
    super(url, `thread/${hash}`);
    this.hash = hash;
    this.content = content;
  }

  public async getPolicy(): Promise<Info> {
    return parse(await this.fetchFrom("policy"));
  }

  public async populate() {
    this.content = await this.fetchFrom("");
  }

  public async getReplies(skip = 0, take?: number): Promise<Thread[]> {
    const replies = await this.fetchFrom("replies", {
      skip: `${skip}`,
      take: `${take}`,
    });

    const hashs = replies.split("\n");
    return hashs.map((hash) => new Thread(this.url, hash, ""));
  }
}
