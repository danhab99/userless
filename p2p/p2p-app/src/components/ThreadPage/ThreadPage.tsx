import { CreateThread } from "../CreateThread/CreateThread";
import { UserlessMarkdownBody } from "../MarkdownBody/UserlessMarkdownBody";
import { UserlessSidebar } from "../Sidebar/UserlessSidebar";

export type ThreadPageProps = {};

export function ThreadPage(props: ThreadPageProps) {
  return (
    <div className="h-full">
      <CreateThread />
      <UserlessSidebar />
      <UserlessMarkdownBody />
    </div>
  );
}
