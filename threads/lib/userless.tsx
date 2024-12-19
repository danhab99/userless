import { UserlessServer } from "api-wrapper";

export const server = new UserlessServer(process.env["NEXT_PUBLIC_USERLESS_URL"] as string);
