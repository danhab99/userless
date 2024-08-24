import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const db = new PrismaClient();

export async function HEAD(request: Request) {
  const u = new URL(request.url);

  const keyId = u.pathname.split("/")[2];

  await db.publicKey.findUniqueOrThrow({
    where: { keyId },
    select: {},
  });

  return new NextResponse(null, {
    status: 200,
  });
}

export async function GET(request: Request) {
  const u = new URL(request.url);

  const keyId = u.pathname.split("/")[2];

  const publicKey = await db.publicKey.findUniqueOrThrow({
    where: { keyId },
    select: {
      armoredKey: true,
    },
  });

  return new NextResponse(publicKey.armoredKey, {
    status: 200,
  });
}
