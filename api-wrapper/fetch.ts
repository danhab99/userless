import { Content, createContent } from "./content";
import { debug } from "./debug";

export interface Fetcher {
  url: string;
  fetch: (path: string, args?: Record<string, any>) => Promise<string>;
  fetchContent: (path: string, args?: Record<string, any>) => Promise<Content>;
}

export interface BaseFetcher extends Fetcher {
  base: string;
  fetchFrom: (path: string, args?: Record<string, any>) => Promise<string>;
}

export function createFetcher(url: string): Fetcher {
  const fetcher = {
    url,
    async fetch(path: string, args?: Record<string, any>): Promise<string> {
      if (path[path.length - 1] === "/") {
        path = path.slice(0, path.length - 1);
      }

      const u = new URL(this.url);
      u.pathname = path;
      if (args) {
        Object.entries(args).forEach(([key, value]) => {
          if (value) {
            u.searchParams.set(key, value);
          }
        });
      }

      debug("fetching", u.toString());
      const resp = await fetch(u.toString());
      debug("fetched", u.toString(), resp.status);

      if (resp.ok) {
        return resp.text();
      } else {
        throw await resp.text();
      }
    },

    async fetchContent(
      path: string,
      args?: Record<string, any>,
    ): Promise<Content> {
      return createContent(await this.fetch(path, args));
    },
  };

  return fetcher;
}

export function createBaseFetcher(url: string, base: string): BaseFetcher {
  const fetcher = createFetcher(url);
  return {
    ...fetcher,
    base,
    async fetchFrom(path: string, args?: Record<string, any>) {
      return fetcher.fetch(`/${this.base}/${path}`, args);
    },
  };
}
