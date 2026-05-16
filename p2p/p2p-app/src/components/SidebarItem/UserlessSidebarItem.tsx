import type { Hash } from "../../lib/p2p";
import { useSelectedThread } from "../contexts/thread_context";
import { useUserless } from "../UserlessProvider/UserlessProvider";
import { SidebarItem } from "./SidebarItem";
import { useAsync } from "react-use";

export type UserlessSidebarItemProps = {
  threadHash: Hash;
};

export function UserlessSidebarItem(props: UserlessSidebarItemProps) {
  const [selectedThread, setSelectedThread] = useSelectedThread();
  const { userless } = useUserless();

  const { value } = useAsync(() => {
    return userless.resolveThread(props.threadHash);
  }, [userless, props.threadHash]);

  return (
    <SidebarItem
      body={value?.body ?? ""}
      ownerEmail={value?.owner.email ?? ""}
      ownerName={value?.owner.name ?? ""}
      timestamp={new Date()}
      onClick={async () => {
        debugger;
        setSelectedThread(value);
      }}
      selected={selectedThread?.hash === props.threadHash}
    />
  );
}
