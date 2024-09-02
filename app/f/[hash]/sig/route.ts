import { NextRequest } from "next/server";
import { BUCKET, s3Client } from "@/lib/s3";
import { redirect } from "next/navigation";

export async function GET(req: NextRequest) {
  const hash = req.nextUrl.pathname.split("/")[2];
  const url = await s3Client.presignedGetObject(BUCKET, hash + "_sig");
  redirect(url);
}
