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

  console.log("Resolving", userlessUrlStr);
  const userlessUrl = new URL(userlessUrlStr);

  if (userlessUrl.protocol.includes("http")) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        Location: userlessUrlStr,
      },
    });
  }

  const userlessPath = userlessUrl.pathname.split("/").slice(1)

  if (userlessPath[0] === "thread") {
    console.log("Finding thread", userlessPath[1])
    const hasThread = await db.thread.count({
      where: { hash: userlessPath[1] },
    });

    if (hasThread > 0) {
      return new NextResponse(`/t/${userlessPath[1]}`)
    } else {
      notFound();
    }
  } else if (userlessPath[0] === "key") {
    console.log("Finding key", userlessPath[1])
    const hasKey = await db.publicKey.count({
      where: {
        finger: userlessPath[1],
      },
    });

    if (hasKey > 0) {
      return new NextResponse(`/k/${userlessPath[1]}`)
    } else {
      notFound();
    }
  } else if (userlessPath[0] === "file") {
    console.log("Finding file", userlessPath[1])
    const hasFile = await db.file.count({
      where: {
        hash: userlessPath[1],
      },
    });
    if (hasFile > 0) {
      return new NextResponse(`/f/${userlessPath[1]}`)
    } else {
      notFound();
    }
  } 

  return new NextResponse(`unknown resource type ${userlessPath[0]}`, {
    status: 403,
  })
}
