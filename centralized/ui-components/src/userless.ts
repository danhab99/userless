import { createClient } from "api-wrapper";

export function getServer() {
  return createClient({
    url: process.env["NEXT_PUBLIC_USERLESS_URL"] as string,
  });
}
