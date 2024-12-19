import { Content } from "./content";
import { debug } from "./debug";

export class Fetcher {
  protected url: string;

  constructor(url: string) {
    this.url = url;
  }

  protected async fetch(
    path: string,
    args?: Record<string, string>,
  ): Promise<string> {
    if (path[path.length-1] === '/') {
      path = path.slice(0, path.length - 1)
    }

    const u = new URL(this.url);
    u.pathname = path;
    if (args) {
      Object.entries(args).forEach(([key, value]) =>
        u.searchParams.set(key, value),
      );
    }

    debug("fetching", u.toString());
    const resp = await fetch(u.toString());
    debug("fetched", u.toString(), resp.status);

    if (process.env["USERLESS_TRACE_FETCHES"] != "") {
      console.trace("USERLESS FETCHED", u.toString(), resp)
    }

    if (resp.ok) {
      return resp.text();
    } else {
      throw await resp.text();
    }
  }

  protected async fetchContent(
    path: string,
    args?: Record<string, string>,
  ): Promise<Content> {
    return new Content(await this.fetch(path, args));
  }
}

export class BaseFetcher extends Fetcher {
  private base: string;

  constructor(url: string, base: string) {
    super(url);
    this.base = base;
  }

  protected async fetchFrom(path: string, args?: Record<string, string>) {
    return this.fetch(`/${this.base}/${path}`, args);
  }
}
