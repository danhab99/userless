import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const db = new PrismaClient();

export async function GET(req: NextRequest) {
  const u = new URL(req.url);
  const threadHash = u.pathname.split("/")[2];

  const replyHashes = await db.thread.findMany({
    where: {
      replyTo: threadHash.toLowerCase(),
    },
    orderBy: {
      timestamp: "desc",
    },
    select: {
      hash: true,
    },
    take: parseInt(u.searchParams.get("take") ?? "100"),
    skip: parseInt(u.searchParams.get("skip") ?? "0"),
  });

  const ret = replyHashes.map((x) => x.hash).join("\n");

  return new NextResponse(ret.trim(), {
    status: 200,
  });
}
