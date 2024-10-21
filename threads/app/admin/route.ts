import {NextRequest, NextResponse} from "next/server";
import { encryptForMasters } from "@/lib/admin";

export async function GET(req: NextRequest) {
  const packet = await encryptForMasters("if you can read this then you're an admin");
  return new NextResponse(packet);
}
