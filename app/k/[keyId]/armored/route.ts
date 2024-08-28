import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const db = new PrismaClient();

export async function HEAD(request: Request) {
  const u = new URL(request.url);
  const finger = u.pathname.split("/")[2].toLowerCase();

  const res = await db.publicKey.findUnique({
    where: { finger },
    select: {
      id: true,
    },
  });

  return new NextResponse(null, {
    status: res ? 200 : 404,
  });
}

export async function GET(request: Request) {
  const u = new URL(request.url);
  const finger = u.pathname.split("/")[2].toLowerCase();

  const publicKey = await db.publicKey.findUnique({
    where: { finger },
    select: {
      armoredKey: true,
    },
  });

  return new NextResponse(publicKey?.armoredKey, {
    status: publicKey ? 200 : 404,
  });
}
