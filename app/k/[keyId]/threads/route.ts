import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const db = new PrismaClient();

export async function GET(req: NextRequest) {
  const u = new URL(req.url);
  const finger = u.pathname.split("/")[2].toLowerCase();

  const replies = await db.thread.findMany({
    where: {
      signedBy: {
        finger,
      },
    },
    select: {
      hash: true,
    },
  });

  const ret = replies.map(x => x.hash).join("\n")

  return new NextResponse(ret);
}
