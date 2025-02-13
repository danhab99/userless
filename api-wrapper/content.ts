import { DELIMITER } from "./const";
import { parse } from "smol-toml";

export interface Content {
  readonly info?: Record<string, any>;
  readonly body: string;
  readonly original: string;
}

export function createContent(content: string): Content {
  if (
    !content.startsWith("-----BEGIN PGP SIGNED MESSAGE-----") ||
    !content.endsWith("-----END PGP SIGNATURE-----\n")
  ) {
    throw "not a pgp clearsigned packet";
  }

  const lines = content.split("\n").map((x) => x.trim());
  const endOfBody = lines.findIndex((x) =>
    x.startsWith("-----BEGIN PGP SIGNATURE-----"),
  );
  const bodyLines = lines.splice(2, endOfBody);
  const delimiter = bodyLines.findIndex((x) => x.startsWith(DELIMITER));

  if (delimiter <= 0) {
    return {
      body: bodyLines.join("\n"),
      original: content,
    };
  } else if (delimiter === endOfBody) {
    return {
      body: "",
      info: parse(bodyLines.join("\n")),
      original: content,
    };
  } else {
    const info = bodyLines.slice(0, delimiter).join("\n");
    const body = bodyLines.slice(delimiter).join("\n");
    return {
      body,
      info: parse(info),
      original: content,
    };
  }
}
