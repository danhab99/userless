import { createClient } from "api-wrapper";

export const DEFAULT_USERLESS_URL = "http://localhost:8080";

export function getUserlessUrl() {
  return process.env["NEXT_PUBLIC_USERLESS_URL"] || DEFAULT_USERLESS_URL;
}

export function getServer() {
  return createClient({
    url: getUserlessUrl(),
  });
}
