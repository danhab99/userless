"use server";
import { createUserlessServer, Thread as ThreadType } from "api-wrapper";
import * as openpgp from "openpgp";

export const server = createUserlessServer(process.env["NEXT_PUBLIC_USERLESS_URL"] as string)

export class Thread {
  readonly thread: ThreadType; 
  readonly msg: openpgp.CleartextMessage
  readonly hash: string;
  
  private constructor(thread: ThreadType, msg: openpgp.CleartextMessage) {
    this.thread = thread;
    this.msg = msg;
    this.hash = thread.hash;
  }

  public static async fetch(hash: string): Promise<Thread>{
    const thread = server.getThread(hash);
    const content = await thread.getContent()
    const msg = await openpgp.readCleartextMessage({
      cleartextMessage: content.original
    })
    return new Thread(thread, msg);
  }

  public async getReplies(skip=0, take?: number) {
    const r = await this.thread.getReplies(skip, take);
    return Promise.all(r.map(thread => Thread.fetch(thread.hash)));
  }

  public async getParents(count=10) {
    const r = await this.thread.getParents(count);
    return Promise.all(r.map(thread => Thread.fetch(thread.hash)));
  }
}
