import type { Peer } from "./p2p";
import type { Hash, PageResult, DEFAULT_PAGE_SIZE } from "./p2p";
import { UserlessDatabase } from "./database";
import { UserlessEventEmitter, type UserlessEventSink } from "./events";

/**
 * PeerScanner handles fetching and caching threads from connected peers.
 * It recursively scans peers for top-level threads and their replies.
 */
export class PeerScanner extends UserlessEventEmitter {
  constructor(
    private db: UserlessDatabase,
    private getPeers: () => Peer[],
    eventSink?: UserlessEventSink,
  ) {
    super(eventSink);
  }

  /**
   * Cache a single thread from a peer if it doesn't exist locally.
   * Returns true if the thread was newly cached, false if it already existed.
   */
  async cacheThreadFromPeer(peer: Peer, hash: Hash): Promise<boolean> {
    const existing = await this.db.getThread(hash);
    if (existing) {
      return false;
    }

    const thread = await peer.getThread({ hash });
    await this.db.saveThread(hash, thread);
    console.log(
      `[userless] thread cached from peer (hash=${hash}, peer=${peer.id})`,
    );
    this.emit("thread_cached", { hash });
    return true;
  }

  /**
   * Recursively scan a peer for reply threads under a parent thread.
   * Returns the total number of newly cached threads.
   */
  private async scanPeerReplies(
    peer: Peer,
    parentHash: Hash,
    visited: Set<string>,
    defaultPageSize: number,
  ): Promise<number> {
    const normalizedParent = parentHash.toLowerCase();
    if (visited.has(normalizedParent)) {
      return 0;
    }
    visited.add(normalizedParent);

    let cursor: string | undefined;
    let totalScanned = 0;

    while (true) {
      const page = await peer.getReplyThreads({
        parentHash,
        cursor,
        limit: defaultPageSize,
      });

      for (const replyHash of page.items) {
        if (await this.cacheThreadFromPeer(peer, replyHash)) {
          totalScanned += 1;
        }

        totalScanned += await this.scanPeerReplies(
          peer,
          replyHash,
          visited,
          defaultPageSize,
        );
      }

      if (!page.next_cursor) {
        break;
      }
      cursor = page.next_cursor;
    }

    return totalScanned;
  }

  /**
   * Scan a peer for all its threads and recursively cache replies.
   */
  async scanPeerForThreads(
    peer: Peer,
    defaultPageSize: number,
  ): Promise<void> {
    let cursor: string | undefined;
    let totalScanned = 0;
    const visitedReplyParents = new Set<string>();

    console.log(`[userless] scanning peer for threads (peer=${peer.id})`);
    while (true) {
      const page = await peer.getAllThreads({
        cursor,
        limit: defaultPageSize,
      });
      if (page.items.length === 0) {
        break;
      }

      for (const hash of page.items) {
        if (await this.cacheThreadFromPeer(peer, hash)) {
          totalScanned += 1;
        }

        totalScanned += await this.scanPeerReplies(
          peer,
          hash,
          visitedReplyParents,
          defaultPageSize,
        );
      }

      if (!page.next_cursor) {
        break;
      }
      cursor = page.next_cursor;
    }
    console.log(
      `[userless] scan complete (peer=${peer.id}, new=${totalScanned})`,
    );
  }

  /**
   * Scan all connected peers for new threads.
   */
  async scanAllPeers(defaultPageSize: number): Promise<void> {
    await Promise.all(
      this.getPeers().map((peer) => this.scanPeerForThreads(peer, defaultPageSize)),
    );
  }
}
