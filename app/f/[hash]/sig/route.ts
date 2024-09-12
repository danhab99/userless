import { NextRequest, NextResponse } from "next/server";
import { BUCKET, s3Client } from "@/lib/s3";

export async function GET(req: NextRequest) {
  const hash = req.nextUrl.pathname.split("/")[2];
  const sig = await s3Client.getObject(BUCKET, hash + "_sig")
  return new NextResponse(sig.read());
}
