import { useSelectedThread } from "../contexts/thread_context";
import { MarkdownBody } from "./MarkdownBody";

type UserlessMarkdownBodyProps = {};

export function UserlessMarkdownBody(props: UserlessMarkdownBodyProps) {
  const [selectedThread] = useSelectedThread();

  return <MarkdownBody body={selectedThread?.body ?? ""} />;
}
