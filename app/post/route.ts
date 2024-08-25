import {uploadThread} from "@/lib/pgchan";
import {redirect} from "next/navigation";

export async function POST(request: Request) {
  const body = await request.text()
  const t = await uploadThread(body)
  redirect(`/t/${t.hash}`)
}
