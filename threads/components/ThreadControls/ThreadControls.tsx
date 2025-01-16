"use client";
import { useMasterKey } from "../KeyContext/KeyContext";
import { createStateContext, useAsyncRetry } from "react-use";
import { server } from "@/lib/userless";
import { Thread } from "api-wrapper";
import { AdminAction } from "../AdminAction/AdminAction";
import { ThreadCardProps } from "../ThreadCard/ThreadCard";
import { ActionButton } from "../ActionButton/ActionButton";
import clsx from "clsx";
import style from "./ThreadControls.module.css";

export type ThreadControlsProps = { thread: Thread };

const [useThreadControlsState, ThreadControlsStateProvider] =
  createStateContext<
    Pick<ThreadCardProps, "showFull" | "showSource" | "showReply">
  >({
    showFull: false,
    showReply: true,
    showSource: false,
  });

export { ThreadControlsStateProvider, useThreadControlsState };

export const ThreadControls = ({ thread }: ThreadControlsProps) => {
  const [{ showFull, showReply, showSource }, set] = useThreadControlsState();
  const master = useMasterKey();

  const { value: policy } = useAsyncRetry(async () => {
    if (master && thread?.hash) {
      return server.getThread(thread.hash).getPolicy();
    }
  }, [master, thread?.hash]);

  return (
    <div className="text-xs">
      {policy?.acceptsReplies ? (
        <ActionButton
          label={showReply ? "Hide reply" : "Reply"}
          onClick={() => set((x) => ({ ...x, showReply: !x.showReply }))}
        />
      ) : null}
      <ActionButton
        label={showSource ? "Hide source" : "Source"}
        onClick={() => set((x) => ({ ...x, showSource: !x.showFull }))}
      />
      <ActionButton
        label={showFull ? "Less" : "More"}
        onClick={() => set((x) => ({ ...x, showFull: !x.showFull }))}
      />
      {master.length > 0 ? (
        <>
          <AdminAction
            hash={thread?.hash ?? ""}
            newPolicy={{
              visible: false,
            }}
            label="Delete"
            loadingLabel="Deleting"
            onClick={policy?.retry}
            color="red"
          />
          <AdminAction
            hash={thread?.hash ?? ""}
            newPolicy={{
              acceptsReplies: !policy?.value?.acceptsReplies,
            }}
            label={
              policy?.value?.acceptsReplies
                ? "Disable replies"
                : "Enable replies"
            }
            loadingLabel="Changing..."
            onClick={policy?.retry}
            color="red"
          />
          <AdminAction
            hash={thread?.hash ?? ""}
            newPolicy={{
              advertise: !policy?.value?.advertise,
            }}
            label={policy?.value?.advertise ? "Unpublish" : "Publish"}
            loadingLabel="Changing..."
            onClick={policy?.retry}
            color="blue"
          />
        </>
      ) : null}
    </div>
  );
};
