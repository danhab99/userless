import { encryptForMasters, getMasters } from "@/lib/admin";
import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import * as openpgp from "openpgp";

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
      policy: true,
    },
  });

  return new NextResponse(JSON.stringify(thread.policy));
}

export async function PATCH(req: NextRequest) {
  const u = new URL(req.url);
  const threadHash = u.pathname.split("/")[2];

  const mastersPromise = getMasters();

  const actionClearText = await req.text();

  const actionPgp = await openpgp.readCleartextMessage({
    cleartextMessage: actionClearText,
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
    console.log("Changing policy", { threadHash, text: actionPgp.getText() });
    await db.thread.update({
      where: { hash: threadHash },
      data: {
        policy: JSON.parse(actionPgp.getText()),
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
