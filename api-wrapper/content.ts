import { DELIMITER } from "./const";
import { parse } from "smol-toml";

export interface Content {
  readonly info?: Record<string, any>;
  readonly body: string;
}

export function createContent(content: string): Content {
  let [info, body] = content.split(DELIMITER, 2);
  if (body) {
    return {
      info: parse(info),
      body
    };
  }
  return {
    body: info
  };
}