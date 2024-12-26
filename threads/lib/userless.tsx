import { createUserlessServer } from "api-wrapper";

export const server = createUserlessServer(process.env["NEXT_PUBLIC_USERLESS_URL"] as string)
