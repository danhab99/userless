import type { Hash } from "../../lib/p2p";
import { useSelectedThread } from "../contexts/thread_context";
import { useUserless } from "../UserlessProvider/UserlessProvider";
import { SidebarItem } from "./SidebarItem";

export type UserlessSidebarItemProps = {
  threadHash: Hash;
};

export function UserlessSidebarItem(props: UserlessSidebarItemProps) {
  const [selectedThread, setSelectedThread] = useSelectedThread();
  const { userless } = useUserless();

  return (
    <SidebarItem
      body={selectedThread?.body ?? ""}
      ownerEmail={selectedThread?.owner.email ?? ""}
      ownerName={selectedThread?.owner.name ?? ""}
      timestamp={new Date()}
      onClick={async () => {
        const thread = await userless?.resolveThread(props.threadHash);
        setSelectedThread(thread);
      }}
      selected={selectedThread?.hash === props.threadHash}
    />
  );
}
