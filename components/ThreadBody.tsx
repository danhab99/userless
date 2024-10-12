import * as openpgp from "openpgp";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Thread } from "@prisma/client";
import { useAsync } from "react-use";
import { DELIMITER } from "@/constants";
import { SignedImage } from "./SignedImage";

type ThreadBodyProps = {
  thread: Thread;
};

const ThreadBody = (props: ThreadBodyProps) => {
  const body = useAsync(async () => {
    const msg = await openpgp.readCleartextMessage({
      cleartextMessage: props.thread.body,
    });

    var content = msg.getText();
    var [info, body] = content.split(DELIMITER, 2);
    body = body || info;

    return body.trim();
  }, [props.thread]);

  return (
    <div className="markdown pb-2">
      <Markdown
        remarkPlugins={[remarkGfm]}
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
