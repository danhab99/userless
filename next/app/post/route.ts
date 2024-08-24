import {uploadThread} from "@/lib/pgchan";
import {redirect} from "next/navigation";

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(request: Request) {
  const body = await request.text()
  const t = await uploadThread(body)
  redirect(`/t/${t.hash}`)
}
