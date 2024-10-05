import { uploadThread } from "@/lib/pgchan";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const t = await uploadThread(body);
  return new NextResponse(t.hash, {
    status: 201,
  });
}
