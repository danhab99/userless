"use client";
import * as openpgp from "openpgp";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Thread } from "@prisma/client";
import { useAsync } from "react-use";
import SigVerify from "./SigVerify";
// import * as syntax_highlight from 'highlight.js/lib/languages/*';

type ThreadBodyProps = {
  thread: Thread;
};

const ThreadBody = (props: ThreadBodyProps) => {
  const body = useAsync(async () => {
    const msg = await openpgp.readCleartextMessage({
      cleartextMessage: props.thread.body,
    });

    var body = msg.getText();
    if (body.startsWith("replyTo:")) {
      body = body.slice(body.indexOf("\n"));
    }

    return body;
  }, [props.thread]);

  return (
    <div className="markdown py-4">
      <Markdown
        remarkPlugins={[remarkGfm]}
        // rehypePlugins={[rehypeHighlight, { languages: syntax_highlight.default }]}
        components={{
          img: (props) => {
            if (!props.src) {
              return <></>;
            }
            const srcUrl = new URL(props.src);

            const resolvedUrl = useAsync(async () => {
              if (props.src && srcUrl.protocol === "userless") {
                const u = new URL(window.location.href);
                u.pathname = "/resolve";
                u.searchParams.set("u", props.src);

                const resp = await fetch(u.toString(), {
                  cache: "force-cache",
                  redirect: "manual",
                });

                return resp.url;
              }
            }, [srcUrl, props.src]);

            const content = useAsync(async () => {
              const url = resolvedUrl.value;
              if (url) {
                const resp = await fetch(url);
                return resp.arrayBuffer();
              }
            }, [resolvedUrl.value]);

            if (srcUrl.protocol === "userless") {
              return (
                <>
                  <img src={resolvedUrl.value ?? ""} {...props} />
                  {content.value ? (
                    <SigVerify detatched content={content.value} />
                  ) : null}
                </>
              );
            } else {
              return <img {...props} />;
            }
          },
        }}
      >
        {body.value}
      </Markdown>
    </div>
  );
};

export default ThreadBody;
