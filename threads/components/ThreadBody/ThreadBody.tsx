import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SignedImage } from "../SignedImage/SignedImage";
import { DELIMITER } from "api-wrapper";

type ThreadBodyProps = {
  body: string;
};

const START_MARKER = "-----BEGIN PGP SIGNED MESSAGE-----";
const END_MARKER = "-----BEGIN PGP SIGNATURE-----";

const ThreadBody = (props: ThreadBodyProps) => {
  const start = props.thread.body.indexOf(START_MARKER);
  const end = props.thread.body.indexOf(END_MARKER);

  const content = props.thread.body.slice(start, end);
  const delimiter = content.indexOf(DELIMITER);
  const body = content.slice(delimiter + START_MARKER.length + 2 + 12).trim();

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
