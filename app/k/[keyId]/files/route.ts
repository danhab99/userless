import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const db = new PrismaClient();

export async function GET(req: NextRequest) {
  const u = new URL(req.url);
  const finger = u.pathname.split("/")[2].toLowerCase();

  const key = await db.file.findMany({
    where: {
      signedBy: {
        finger,
      },
    },
    orderBy: {
      timestamp: "desc",
    },
    select: {
      hash: true,
    },
    skip: parseInt(u.searchParams.get("skip") ?? ""),
    take: parseInt(u.searchParams.get("take") ?? ""),
  });

  const hashes = key.map((x) => x.hash).join("\n");

  return new NextResponse(hashes);
}
