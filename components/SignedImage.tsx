"use client";
import { Thread } from "@prisma/client";
import { useAsync, useLogger } from "react-use";
import SigVerify from "./SigVerify";
import { DELIMITER } from "@/constants";
// import * as syntax_highlight from 'highlight.js/lib/languages/*';

type ThreadBodyProps = {
  thread: Thread;
};

const USERLESS_SCHEMA_NAME = "userless:";

export function SignedImage(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  const resolvedUrl = useAsync(async () => {
    const srcUrl = new URL(props.src as string);
    if (srcUrl.protocol === USERLESS_SCHEMA_NAME) {
      const u = new URL(window.location.href);
      u.pathname = "/resolve";
      u.searchParams.set("u", props.src as string);

      const resp = await fetch(u.toString(), {
        cache: "force-cache",
      });

      return resp.text();
    }
  }, [props.src]);

  const content = useAsync(async () => {
    const url = resolvedUrl.value;
    if (url) {
      const resp = await fetch(url);
      return resp.arrayBuffer();
    }
  }, [resolvedUrl.value]);

  const srcUrl = new URL(props.src as string);
  if (srcUrl.protocol === USERLESS_SCHEMA_NAME) {
    if (resolvedUrl.value) {
      return (
        <>
          <img {...props} src={resolvedUrl.value} />
          {content.value ? (
            <span className="text-xs">
              <SigVerify detatched content={content.value} />
            </span>
          ) : null}
        </>
      );
    } else {
      return <i>resolving ${props.src}...</i>;
    }
  } else {
    return <img {...props} />;
  }
}
