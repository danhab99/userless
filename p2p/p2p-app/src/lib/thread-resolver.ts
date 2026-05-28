import * as openpgp from "openpgp";
import type {
  Hash,
  Thread,
  PageResult,
  PageParams,
  PublicKey,
} from "./p2p";
import { UserlessDatabase } from "./database";
import { UserlessEventEmitter, type UserlessEventSink } from "./events";

export type ResolvedThread = {
  hash: Hash;
  body: string;
  content: string;
  timestamp: Date;
  owner: {
    fingerprint: string;
    name: string;
    email: string;
  };
};

/**
 * Helper to extract owner details from userId and fingerprint.
 */
function extractOwner(userId: string | undefined, fallbackFingerprint: string) {
  if (!userId) {
    return {
      fingerprint: fallbackFingerprint,
      name: fallbackFingerprint.slice(0, 16),
      email: "",
    };
  }

  const match = userId.match(/^(.*?)(?:\s*<([^>]+)>)?$/);
  return {
    fingerprint: fallbackFingerprint,
    name: match?.[1]?.trim() || fallbackFingerprint.slice(0, 16),
    email: match?.[2]?.trim() || "",
  };
}

/**
 * Helper to extract reply target from message body.
 */
function extractReplyTarget(body: string): string | undefined {
  const patterns = [
    /in-reply-to\s*:\s*([a-f0-9]{8,64})/i,
    /replyto\s*=\s*"?([a-f0-9]{8,64})"?/i,
  ];

  for (const pattern of patterns) {
    const match = body.match(pattern);
    if (match?.[1]) {
      return match[1].toLowerCase();
    }
  }

  return undefined;
}

/**
 * Helper to extract signature timestamp from PGP message.
 */
async function extractSignatureTimestamp(
  content: string,
): Promise<Date | undefined> {
  const signatureMatch = content.match(
    /-----BEGIN PGP SIGNATURE-----[\s\S]+?-----END PGP SIGNATURE-----/,
  );
  if (!signatureMatch) {
    return undefined;
  }

  try {
    const signature = await openpgp.readSignature({
      armoredSignature: signatureMatch[0],
    });
    const created = signature.packets[0]?.created;
    if (created instanceof Date) {
      return created;
    }
  } catch {
    // Keep timestamp optional when signature parsing fails.
  }

  return undefined;
}

function getPageWindow(params: PageParams) {
  const offset = params.cursor ? Number.parseInt(params.cursor, 10) || 0 : 0;
  const limit = params.limit ?? 20; // DEFAULT_PAGE_SIZE
  return { offset, limit };
}

function toPageResult<T>(
  items: T[],
  offset: number,
  limit: number,
): PageResult<T> {
  return {
    items,
    next_cursor:
      items.length < limit ? undefined : String(offset + items.length),
  };
}

/**
 * ThreadResolver handles thread hierarchy, resolution, and querying.
 * Resolves thread details (body, owner, timestamp) and manages thread relationships.
 */
export class ThreadResolver extends UserlessEventEmitter {
  private relationshipCache:
    | {
        signature: string;
        roots: Hash[];
        repliesByParent: Map<Hash, Hash[]>;
      }
    | undefined;

  constructor(
    private db: UserlessDatabase,
    private queryPublicKey: (
      fingerprintOrId: string,
    ) => Promise<PublicKey | undefined>,
    eventSink?: UserlessEventSink,
  ) {
    super(eventSink);
  }

  private async getThreadRelationshipIndex(): Promise<{
    roots: Hash[];
    repliesByParent: Map<Hash, Hash[]>;
  }> {
    const hashes = (await this.db.getAllThreadKeys()).sort();
    const signature = hashes.join(",");

    if (this.relationshipCache?.signature === signature) {
      return {
        roots: this.relationshipCache.roots,
        repliesByParent: this.relationshipCache.repliesByParent,
      };
    }

    const roots: Hash[] = [];
    const repliesByParent = new Map<Hash, Hash[]>();

    for (const hash of hashes) {
      const thread = await this.db.getThread(hash);
      if (!thread) {
        continue;
      }

      let parent: string | undefined;

      try {
        const message = await openpgp.readCleartextMessage({
          cleartextMessage: thread.content,
        });
        parent = extractReplyTarget(message.getText());
      } catch {
        // Keep parse failures visible at top-level.
        parent = undefined;
      }

      if (!parent) {
        roots.push(hash);
        continue;
      }

      const existing = repliesByParent.get(parent) ?? [];
      existing.push(hash);
      repliesByParent.set(parent, existing);
    }

    this.relationshipCache = {
      signature,
      roots,
      repliesByParent,
    };

    return { roots, repliesByParent };
  }

  /**
   * Get all top-level thread hashes (threads with no parent).
   */
  async getTopLevelThreadHashesAll(): Promise<Hash[]> {
    const { roots } = await this.getThreadRelationshipIndex();
    return roots;
  }

  /**
   * Get a paginated list of top-level thread hashes.
   */
  async getTopLevelThreadHashesPage(
    cursor?: string,
    limit = 20, // DEFAULT_PAGE_SIZE
  ): Promise<PageResult<Hash>> {
    const { offset, limit: pageLimit } = getPageWindow({ cursor, limit });
    const roots = await this.getTopLevelThreadHashesAll();

    return toPageResult(
      roots.slice(offset, offset + pageLimit),
      offset,
      pageLimit,
    );
  }

  /**
   * Get all reply thread hashes for a given parent thread.
   */
  private async getReplyThreadHashesAll(parentHash: Hash): Promise<Hash[]> {
    const target = parentHash.toLowerCase();
    const { repliesByParent } = await this.getThreadRelationshipIndex();
    return repliesByParent.get(target) ?? [];
  }

  /**
   * Get a paginated list of reply thread hashes for a given parent.
   */
  async getReplyThreadHashesPage(
    parentHash: Hash,
    cursor?: string,
    limit = 20, // DEFAULT_PAGE_SIZE
  ): Promise<PageResult<Hash>> {
    const { offset, limit: pageLimit } = getPageWindow({ cursor, limit });
    const replies = await this.getReplyThreadHashesAll(parentHash);

    return toPageResult(
      replies.slice(offset, offset + pageLimit),
      offset,
      pageLimit,
    );
  }

  /**
   * Resolve a thread into detailed form with owner info and timestamp.
   */
  async buildResolvedThread(
    hash: Hash,
    thread: Thread,
  ): Promise<ResolvedThread> {
    const message = await openpgp.readCleartextMessage({
      cleartextMessage: thread.content,
    });
    const body = message.getText();
    const timestamp =
      (await extractSignatureTimestamp(thread.content)) ?? new Date(0);
    const fingerprint = message.getSigningKeyIDs()[0]?.toHex() ?? "unknown";

    let owner = extractOwner(undefined, fingerprint);
    if (fingerprint !== "unknown") {
      const key = await this.queryPublicKey(fingerprint);
      if (key) {
        const parsedKey = await openpgp.readKey({ armoredKey: key.armored });
        owner = extractOwner(parsedKey.getUserIDs()[0], fingerprint);
      }
    }

    return {
      hash,
      body,
      content: thread.content,
      timestamp,
      owner,
    };
  }

  /**
   * Get a paginated list of resolved (detailed) threads.
   */
  async listResolvedThreads(
    threads: Thread[],
    threadHashes: Hash[],
    cursor?: string,
    limit = 20, // DEFAULT_PAGE_SIZE
  ): Promise<PageResult<ResolvedThread>> {
    const { offset, limit: pageLimit } = getPageWindow({ cursor, limit });
    const pageHashes = threadHashes.slice(offset, offset + pageLimit);

    return {
      items: await Promise.all(
        pageHashes.map((hash, idx) =>
          this.buildResolvedThread(hash, threads[offset + idx])
        ),
      ),
      next_cursor:
        threadHashes.length <= offset + pageLimit
          ? undefined
          : String(offset + pageLimit),
    };
  }

  /**
   * Get all resolved (detailed) threads.
   */
  async getAllResolvedThreads(): Promise<ResolvedThread[]> {
    const hashes = await this.db.getAllThreadKeys();
    const results: ResolvedThread[] = [];

    for (const hash of hashes) {
      const thread = await this.db.getThread(hash);
      if (thread) {
        results.push(await this.buildResolvedThread(hash, thread));
      }
    }

    return results;
  }

  /**
   * Get all reply threads (resolved) for a given parent.
   */
  async getReplyThreads(parentHash: Hash): Promise<ResolvedThread[]> {
    const lowerHash = parentHash.toLowerCase();
    const matching: ResolvedThread[] = [];

    const allThreads = await this.getAllResolvedThreads();
    for (const thread of allThreads) {
      if (thread.hash.toLowerCase() === lowerHash) {
        continue;
      }

      const target = extractReplyTarget(thread.body);
      if (target === lowerHash) {
        matching.push(thread);
      }
    }

    return matching;
  }
}
