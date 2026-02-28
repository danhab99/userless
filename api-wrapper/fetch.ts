import { Content } from "./types";
import { createContent } from "./content";
import { debug } from "./debug";

export async function fetchText(
  url: string,
  path: string,
  args?: Record<string, any>
): Promise<string> {
  let finalPath = path;
  if (finalPath[finalPath.length - 1] === "/") {
    finalPath = finalPath.slice(0, finalPath.length - 1);
  }

  const u = new URL(url);
  u.pathname = finalPath;
  if (args) {
    Object.entries(args).forEach(([key, value]) => {
      if (value) {
        u.searchParams.set(key, value);
      }
    });
  }

  try {
    debug("fetching", u.toString());
    const resp = await fetch(u.toString(), {
      headers: {
        'Accept': 'application/json, text/plain, */*',
      },
    });
    debug("fetched", u.toString(), resp.status);

    if (!resp.ok) {
      const error = await resp.text().catch(() => "Unknown error");
      throw new Error(`HTTP error ${resp.status}: ${error}`);
    }
    
    return resp.text();
  } catch (e) {
    if (e instanceof Error) {
      console.error(`!!! Userless API wrapper error: ${e.message} (URL: ${u.toString()})`);
    } else {
      console.error(`!!! Userless API wrapper: unable to fetch url: ${u.toString()}`);
    }
    throw e;
  }
}

export async function fetchWithRedirect(
  url: string,
  path: string,
  args?: Record<string, any>
): Promise<{ content: string; finalUrl: string }> {
  let finalPath = path;
  if (finalPath[finalPath.length - 1] === "/") {
    finalPath = finalPath.slice(0, finalPath.length - 1);
  }

  const u = new URL(url);
  u.pathname = finalPath;
  if (args) {
    Object.entries(args).forEach(([key, value]) => {
      if (value) {
        u.searchParams.set(key, value);
      }
    });
  }

  try {
    debug("fetching with redirect tracking", u.toString());
    const resp = await fetch(u.toString(), {
      headers: {
        'Accept': 'application/json, text/plain, */*',
      },
    });
    debug("fetched", u.toString(), resp.status, "final URL:", resp.url);

    if (!resp.ok) {
      const error = await resp.text().catch(() => "Unknown error");
      throw new Error(`HTTP error ${resp.status}: ${error}`);
    }

    return {
      content: await resp.text(),
      finalUrl: resp.url,
    };
  } catch (e) {
    if (e instanceof Error) {
      console.error(`!!! Userless API wrapper error: ${e.message} (URL: ${u.toString()})`);
    } else {
      console.error(`!!! Userless API wrapper: unable to fetch url: ${u.toString()}`);
    }
    throw e;
  }
}

export async function fetchContent(
  url: string,
  path: string,
  args?: Record<string, any>
): Promise<Content> {
  const text = await fetchText(url, path, args);
  return createContent(text);
}

export async function fetchFrom(
  url: string,
  base: string,
  path?: string,
  args?: Record<string, any>
): Promise<string> {
  return fetchText(
    url,
    `/${base}${path ? `/${path}` : ""}`,
    args
  );
}
