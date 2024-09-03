import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const db = new PrismaClient();

export async function GET(req: NextRequest) {
  const u = new URL(req.url);
  const threadHash = u.pathname.split("/")[2];

  const thread = await db.thread.findUniqueOrThrow({
    where: {
      hash: threadHash.toLowerCase(),
      policy: {
        is: {
          visible: true,
        },
      },
    },
    select: {
      body: true,
    },
  });

  return new NextResponse(thread.body);
}
