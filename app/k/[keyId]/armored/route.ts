import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const db = new PrismaClient();

export async function HEAD(request: Request) {
  const u = new URL(request.url);
  const keyId = u.pathname.split("/")[2].toLowerCase();

  const res = await db.publicKey.count({
    where: { keyId },
  });

  console.log("Finding public key", keyId, res);

  return new NextResponse(null, {
    status: res > 0 ? 200 : 404,
    headers: {
      "cache-control": " public, max-age=31536000, immutable",
    },
  });
}

export async function GET(request: Request) {
  const u = new URL(request.url);
  const keyId = u.pathname.split("/")[2].toLowerCase();

  const publicKey = await db.publicKey.findFirst({
    where: { keyId },
    select: {
      armoredKey: true,
    },
  });

  console.log("Sending public key", keyId);

  return new NextResponse(publicKey?.armoredKey, {
    status: publicKey ? 200 : 404,
    headers: {
      "cache-control": " public, max-age=31536000, immutable",
    },
  });
}
