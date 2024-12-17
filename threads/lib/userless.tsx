import { UserlessServer } from "api-wrapper";

export const server = new UserlessServer(process.env["USERLESS_URL"] as string);
