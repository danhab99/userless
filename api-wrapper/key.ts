import { fetchFrom } from "./fetch";
import { parse } from "smol-toml";
import { Thread, Policy, UserlessConfig } from "./types";

function getUrl(config: UserlessConfig | string): string {
  return typeof config === "string" ? config : config.url;
}

export async function getArmoredKey(
  config: UserlessConfig | string,
  keyId: string
): Promise<string> {
  return fetchFrom(getUrl(config), `key/${keyId}`, "");
}

export async function getThreadsForKey(
  config: UserlessConfig | string,
  keyId: string,
  skip?: number,
  take?: number
): Promise<Thread[]> {
  const url = getUrl(config);
  const threadHashes = await fetchFrom(url, `key/${keyId}`, "threads", {
    skip,
    take,
  });
  const hashs = threadHashes.split("\n").filter((x: string) => x);
  return hashs.map((hash: string) => ({ type: "hash" as const, hash, url }));
}

export async function getFilesForKey(
  config: UserlessConfig | string,
  keyId: string
): Promise<string[]> {
  return (await fetchFrom(getUrl(config), `key/${keyId}`, "files")).split("\n");
}

export async function getPolicyForKey(
  config: UserlessConfig | string,
  keyId: string
): Promise<Policy> {
  return parse(await fetchFrom(getUrl(config), `key/${keyId}`, "policy"));
}
