"use client";
import * as openpgp from "openpgp";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Thread } from "@prisma/client";
import { useAsync, useLogger } from "react-use";
import SigVerify from "./SigVerify";
// import * as syntax_highlight from 'highlight.js/lib/languages/*';

type ThreadBodyProps = {
  thread: Thread;
};

const USERLESS_SCHEMA_NAME = "userless:";

function SignedImage(props: React.ImgHTMLAttributes<HTMLImageElement>) {
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
        {content.value ? <span className="text-xs"><SigVerify detatched content={content.value} /></span> : null}
      </>
    );
    } else {
      return <i>resolving ${props.src}...</i>
    }
  } else {
    return <img {...props} />;
  }
}

const ThreadBody = (props: ThreadBodyProps) => {
  const body = useAsync(async () => {
    const msg = await openpgp.readCleartextMessage({
      cleartextMessage: props.thread.body,
    });

    var content = msg.getText();
    var [info, body] = content.split("---", 2);
    body = body || info;

    return body.trim();
  }, [props.thread]);

  return (
    <div className="markdown pb-2">
      <Markdown
        remarkPlugins={[remarkGfm]}
        // rehypePlugins={[rehypeHighlight, { languages: syntax_highlight.default }]}
        urlTransform={(url, key, node) => {
          return url;
        }}
        components={{
          img: SignedImage,
        }}
      >
        {body.value}
      </Markdown>
    </div>
  );
};

export default ThreadBody;
