import { PrismaClient } from "@prisma/client";
import { notFound, redirect } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";

const db = new PrismaClient();

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const userlessUrlStr = url.searchParams.get("u");
  if (!userlessUrlStr) {
    return new NextResponse(null, {
      status: 400,
    });
  }

  const userlessUrl = new URL(userlessUrlStr);

  if (userlessUrl.protocol.includes("http")) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        Location: userlessUrlStr,
      },
    });
  }

  const userlessPath = userlessUrl.pathname.split("/");

  if (userlessPath[0] === "t") {
    const hasThread = await db.thread.count({
      where: { hash: userlessPath[1],
      },
    });

    if (hasThread) {
      return redirect(`/t/${userlessPath[1]}`);
    } else {
      return notFound();
    }
  } else if (userlessPath[0] === "k") {
    const hasKey = await db.publicKey.count({
      where: {
        finger: userlessPath[1],
      },
    });

    if (hasKey) {
      return redirect(`/k/${userlessPath[1]}`);
    } else {
      return notFound();
    }
  }

  notFound();
}
