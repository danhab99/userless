import { PrismaClient } from "@prisma/client";

import { ThreadForThreadCard } from "@/global";

const db = new PrismaClient();

export const includes = {
  include: {
    signedBy: {
      select: {
        email: true,
        name: true,
        keyId: true,
      },
    },
  },
};

export async function getThread(
  hash: string,
): Promise<ThreadForThreadCard | null> {
  return db.thread.findUnique({ where: { hash }, ...includes });
}

export async function getReplies(hash: string): Promise<ThreadForThreadCard[]> {
  return db.thread.findMany({
    where: {
      replyTo: hash,
    },
    ...includes,
  });
}

export async function getParents(
  hash: string,
  limit?: number,
): Promise<ThreadForThreadCard[]> {
  const startThread = await db.thread.findUnique({
    where: {
      hash,
    },
    ...includes,
  });

  if (!startThread) {
    return [];
  }

  const ancestors: ThreadForThreadCard[] = [startThread];

  var max = limit ?? Number.MAX_VALUE;

  while (max-- > 0 && ancestors[ancestors.length - 1].replyTo) {
    const thread: ThreadForThreadCard | null = await db.thread.findFirst({
      where: {
        hash: ancestors[ancestors.length - 1].replyTo as string,
      },
      ...includes,
    });

    if (!thread) {
      break;
    }

    ancestors.push(thread);
  }

  return ancestors.slice(1);
}
