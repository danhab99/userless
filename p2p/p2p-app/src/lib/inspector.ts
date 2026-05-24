import * as openpgp from "openpgp";
import { DEFAULT_PAGE_SIZE, type TransferStats } from "./p2p";
import type { ResolvedThread } from "./thread-resolver";
import { UserlessDatabase } from "./database";

export type UserlessSnapshot = TransferStats & {
  connectionCount: number;
  threadCount: number;
  fileCount: number;
  keyCount: number;
};

export type PublicKeyDetail = {
  fingerprint: string;
  armor: string;
  userId: string;
  threadCount: number;
};

export class UserlessInspector {
  private db: UserlessDatabase;
  private getConnectionCount: () => number;
  private getTransferStats: () => TransferStats;
  private listResolvedThreads: (
    cursor?: string,
    limit?: number,
  ) => Promise<{ items: ResolvedThread[]; next_cursor?: string }>;

  constructor(
    db: UserlessDatabase,
    getConnectionCount: () => number,
    getTransferStats: () => TransferStats,
    listResolvedThreads: (
      cursor?: string,
      limit?: number,
    ) => Promise<{ items: ResolvedThread[]; next_cursor?: string }>,
  ) {
    this.db = db;
    this.getConnectionCount = getConnectionCount;
    this.getTransferStats = getTransferStats;
    this.listResolvedThreads = listResolvedThreads;
  }

  async getAllPublicKeysDetailed(): Promise<PublicKeyDetail[]> {
    const keys = await this.db.getAllPublicKeys();
    const details: PublicKeyDetail[] = [];

    for (const key of keys) {
      let userId = "";
      try {
        const parsedKey = await openpgp.readKey({ armoredKey: key.armored });
        userId = parsedKey.getUserIDs()[0] || "";
      } catch {
        // Use empty userId if parsing fails.
      }

      details.push({
        fingerprint: key.fingerprint,
        armor: key.armored,
        userId,
        threadCount: 0,
      });
    }

    return details;
  }

  async getThreadsByPublicKey(fingerprint: string): Promise<ResolvedThread[]> {
    const matching: ResolvedThread[] = [];
    let cursor: string | undefined;

    while (true) {
      const page = await this.listResolvedThreads(cursor, DEFAULT_PAGE_SIZE);
      for (const thread of page.items) {
        if (thread.owner.fingerprint.toLowerCase() === fingerprint.toLowerCase()) {
          matching.push(thread);
        }
      }

      if (!page.next_cursor) {
        break;
      }
      cursor = page.next_cursor;
    }

    return matching;
  }

  async getSnapshot(): Promise<UserlessSnapshot> {
    const [threadCount, fileCount, keyCount] = await Promise.all([
      this.db.getThreadCount(),
      this.db.getFileCount(),
      this.db.getPublicKeyCount(),
    ]);

    const transfer = this.getTransferStats();

    return {
      connectionCount: this.getConnectionCount(),
      threadCount,
      fileCount,
      keyCount,
      uploadedBytes: transfer.uploadedBytes,
      downloadedBytes: transfer.downloadedBytes,
    };
  }
}