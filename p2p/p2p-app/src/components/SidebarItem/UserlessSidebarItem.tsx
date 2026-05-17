import type { Hash } from "../../lib/p2p";
import { useSelectedThread } from "../contexts/thread_context";
import { useUserless } from "../UserlessProvider/UserlessProvider";
import { SidebarItem } from "./SidebarItem";
import { useAsync } from "react-use";
import { useState } from "react";
import { EmergencyDialog } from "../EmergencyDialog/EmergencyDialog";

export type UserlessSidebarItemProps = {
  threadHash: Hash;
};

export function UserlessSidebarItem(props: UserlessSidebarItemProps) {
  const [selectedThread, setSelectedThread] = useSelectedThread();
  const { userless } = useUserless();
  const [showEmergency, setShowEmergency] = useState(false);

  const { value } = useAsync(() => {
    return userless.resolveThread(props.threadHash);
  }, [userless, props.threadHash]);

  return (
    <>
      <SidebarItem
        body={value?.body ?? ""}
        ownerEmail={value?.owner.email ?? ""}
        ownerName={value?.owner.name ?? ""}
        timestamp={value?.timestamp ?? new Date(0)}
        onClick={async () => {
          setSelectedThread(value);
        }}
        selected={selectedThread?.hash === props.threadHash}
        onEmergency={() => setShowEmergency(true)}
        onHide={async () => {
          await userless.hideThread(props.threadHash);
          if (selectedThread?.hash === props.threadHash) {
            setSelectedThread(undefined);
          }
        }}
      />
      {showEmergency ? (
        <EmergencyDialog
          threadHash={props.threadHash}
          onClose={() => setShowEmergency(false)}
        />
      ) : null}
    </>
  );
}
