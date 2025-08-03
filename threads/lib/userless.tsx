import { createUserlessServer } from "api-wrapper";

export async function getServer() {
  return createUserlessServer(process.env["NEXT_PUBLIC_USERLESS_URL"] as string)
}

