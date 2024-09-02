import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { encryptForMasters, getMasters } from "@/lib/admin";
import * as openpgp from "openpgp";

const db = new PrismaClient();

export async function GET(req: NextRequest) {
  const u = new URL(req.url);
  const threadHash = u.pathname.split("/")[2];

  const thread = await db.thread.findUniqueOrThrow({
    where: {
      hash: threadHash.toLowerCase(),
    },
    select: {
      policy: true,
    },
  });

  return new NextResponse(
    await encryptForMasters(JSON.stringify(thread.policy)),
  );
}

export async function PATCH(req: NextRequest) {
  const u = new URL(req.url);
  const threadHash = u.pathname.split("/")[2];

  const mastersPromise = getMasters();

  const actionClearText = await req.text();

  const actionPgp = await openpgp.createCleartextMessage({
    text: actionClearText,
  });

  const masters = await mastersPromise;

  const verification = await actionPgp.verify(
    await Promise.all(
      masters.map((x) =>
        openpgp.readKey({
          armoredKey: x.armoredKey,
        }),
      ),
    ),
  );

  const verifieds = await Promise.all(verification.map((v) => v.signature));
  const verified = verifieds.every((x) => x);

  if (verified) {
    await db.thread.update({
      where: { hash: threadHash },
      data: {
        policy: {},
      },
    });

    return new NextResponse(null, {
      status: 202,
    });
  } else {
    return new NextResponse(null, {
      status: 401,
    });
  }
}
