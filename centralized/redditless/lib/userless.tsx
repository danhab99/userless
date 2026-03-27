import { createClient } from "api-wrapper";

export function getServer() {
  const url = process.env["NEXT_PUBLIC_USERLESS_URL"] || "http://localhost:8080";
  
  return createClient({
    url: url
  });
}

