export type Info = Record<string, any>;

export type Banner = {
  body: string;
  info: Info
};

export type Content = {
  readonly info?: Record<string, any>;
  readonly body: string;
  readonly original: string;
};

export type ThreadByHash = {
  type: "hash";
  url: string;
  hash: string;
};

export type ThreadByRef = {
  type: "ref";
  url: string;
  ref: string;
};

export type Thread = ThreadByHash | ThreadByRef;

export interface ResolvedThread {
  readonly url: string;
  readonly hash: string;
  getContent(): Promise<Content>;
  getPolicy(): Promise<Info>;
  getReplies(skip?: number, take?: number): Promise<ResolvedThread[]>;
  getParents(count?: number): Promise<ResolvedThread[]>;
  getOwner(): Promise<string>;
}

export interface UserlessConfig {
  url: string;
}

export type Policy = Info;

