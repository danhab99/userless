import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SignedImage } from "../SignedImage/SignedImage";

type ThreadBodyProps = {
  body: string;
};

const DELIMITER = "=========="

const ThreadBody = (props: ThreadBodyProps) => {
  const tomlDelimiterIndex = props.body.indexOf(DELIMITER);
  let body = props.body;

  if ( tomlDelimiterIndex >= 0 ) {
    body = body.slice(tomlDelimiterIndex + DELIMITER.length)
  }

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
        {body}
      </Markdown>
    </div>
  );
};

export default ThreadBody;
