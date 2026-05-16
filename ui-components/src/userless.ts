import { createClient } from "api-wrapper";

export const DEFAULT_USERLESS_URL = "http://localhost:8080";

export function resolveUserlessUrl(url?: string) {
  return url ?? DEFAULT_USERLESS_URL;
}

export function createUserlessClient(url?: string) {
  return createClient({
    url: resolveUserlessUrl(url),
  });
}
