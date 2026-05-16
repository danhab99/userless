import { CreateThread } from "../CreateThread/CreateThread";
import { UserlessMarkdownBody } from "../MarkdownBody/UserlessMarkdownBody";
import { UserlessSidebar } from "../Sidebar/UserlessSidebar";

export type ThreadPageProps = {};

export function ThreadPage(props: ThreadPageProps) {
  return (
    <div className="h-full">
      <CreateThread />
      <div className="h-full flex flex-row">
        <UserlessSidebar />
        <UserlessMarkdownBody />
      </div>
    </div>
  );
}
