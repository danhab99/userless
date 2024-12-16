import {Content} from "./content";

export class Fetcher {
  protected url: string;

  constructor(url: string) {
    this.url = url;
  }

  protected async fetch(
    path: string,
    args?: Record<string, string>,
  ): Promise<string> {
    const u = new URL(this.url);
    u.pathname = path;
    if (args) {
      Object.entries(args).forEach(([key, value]) =>
        u.searchParams.set(key, value),
      );
    }

    const resp = await fetch(u.toString());
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
    return new Content(await this.fetch(path, args))
  }
}

export class BaseFetcher extends Fetcher {
  private base: string;

  constructor(url: string, base: string) {
    super(url);
    this.base = base;
  }

  public async fetchFrom(path: string, args?: Record<string, string>) {
    return this.fetch(`/${this.base}/${path}`, args);
  }

}
