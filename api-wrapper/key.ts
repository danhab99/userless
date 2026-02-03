import { fetchFrom } from "./fetch";
import { parse } from "smol-toml";
import { Thread, Policy } from "./types";

export async function getArmoredKey(
  url: string,
  keyId: string
): Promise<string> {
  return fetchFrom(url, `key/${keyId}`, "");
}

export async function getThreadsForKey(
  url: string,
  keyId: string,
  skip?: number,
  take?: number
): Promise<Thread[]> {
  const threadHashes = await fetchFrom(url, `key/${keyId}`, "threads", {
    skip,
    take,
  });
  const hashs = threadHashes.split("\n").filter((x) => x);
  return hashs.map((hash) => ({ type: "hash", hash, url }));
}

export async function getFilesForKey(
  url: string,
  keyId: string
): Promise<string[]> {
  const resp = await fetchFrom(url, `key/${keyId}`, "files");
  return resp.split("\n");
}

export async function getPolicyForKey(
  url: string,
  keyId: string
): Promise<Policy> {
  return parse(await fetchFrom(url, `key/${keyId}`, "policy"));
}
