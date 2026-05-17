import clsx from "clsx";
import style from "./Sidebar.module.css";
import InfiniteScroll from "react-infinite-scroll-component";
import { ActionButton } from "@userless/ui-components";
import {
  UserlessSidebarItem,
  type UserlessSidebarItemProps,
} from "../SidebarItem/UserlessSidebarItem";

export type SidebarProps = {
  width?: number;
  items: UserlessSidebarItemProps[];
  onNext: () => void;
  hasMore: boolean;
  onRescanAllPeers?: () => void | Promise<void>;
  isRescanning?: boolean;
};

export function Sidebar(props: SidebarProps) {
  const canRescan = !!props.onRescanAllPeers && !props.isRescanning;

  return (
    <div
      className={clsx("bg-700 text-200 h-full shrink-0", style.SidebarShell)}
      style={{ width: props.width ?? "33.3333%" }}
    >
      <div id="sidebar-scroll-region" className={style.ScrollRegion}>
        <InfiniteScroll
          dataLength={props.items.length} //This is important field to render the next data
          next={props.onNext}
          hasMore={props.hasMore}
          loader={<h4>Loading...</h4>}
          scrollableTarget="sidebar-scroll-region"
        >
          {props.items.length === 0 ? "no threads found..." : null}
          <div className={clsx([style.Sidebar])}>
            {props.items.map((item, i) => (
              <UserlessSidebarItem key={i} {...item} />
            ))}
          </div>
        </InfiniteScroll>
      </div>

      <div className={style.Footer}>
        <ActionButton
          label={props.isRescanning ? "Rescanning peers..." : "Rescan All Peers"}
          color={clsx(style.RescanActionLabel)}
          onClick={canRescan ? () => void props.onRescanAllPeers?.() : undefined}
        />
      </div>
    </div>
  );
}
