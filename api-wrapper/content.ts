import { DELIMITER } from "./const";
import { parse } from "smol-toml";

export class Content {
  readonly info?: Record<string, any>;
  readonly body: string;

  constructor(content: string) {
    let [info, body] = content.split(DELIMITER, 2);
    console.log("NEW CONTENT", {content, info, body});
    if (body) {
      this.info = parse(info);
      this.body = body
    } else {
      this.body = info;
    }
  }
}
