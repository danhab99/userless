import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SignedImage } from "../SignedImage/SignedImage";
import { Thread } from "api-wrapper";

type ThreadBodyProps = {
  body: string;
};

const ThreadBody = (props: ThreadBodyProps) => {
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
        {props.body}
      </Markdown>
    </div>
  );
};

export default ThreadBody;
