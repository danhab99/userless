"use client";
import { Thread } from "@prisma/client";
import { useAsync, useLogger, useStartTyping } from "react-use";
import SigVerify from "./SigVerify";
import { DELIMITER } from "@/constants";
import { useInView } from "react-intersection-observer";
import { useState } from "react";
// import * as syntax_highlight from 'highlight.js/lib/languages/*';

const USERLESS_SCHEMA_NAME = "userless:";

export function SignedImage(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [inView, setInView] = useState(false);
  const [ref] = useInView({
    triggerOnce: true,
    onChange: (v) => setInView((x) => x || v),
    delay: 500,
  });

  const resolvedUrl = useAsync(async () => {
    if (inView) {
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
    }
  }, [props.src, inView]);

  const content = useAsync(async () => {
    if (inView) {
      const url = resolvedUrl.value;
      if (url) {
        const resp = await fetch(url);
        return resp.arrayBuffer();
      }
    }
  }, [resolvedUrl.value, inView]);

  const srcUrl = new URL(props.src as string);

  let component;

  if (srcUrl.protocol === USERLESS_SCHEMA_NAME) {
    if (resolvedUrl.value) {
      component = (
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
      component = <i>resolving ${props.src}...</i>;
    }
  } else {
    component = <img {...props} />;
  }

  return <div ref={ref}>{component}</div>;
}
