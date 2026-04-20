import clsx from "clsx";
import style from "./Sidebar.module.css";
import { SidebarItem, type SidebarItemProps } from "../SidebarItem/SidebarItem";
import InfiniteScroll from "react-infinite-scroll-component";

export type SidebarProps = {
  items: SidebarItemProps[];
  onNext: () => void;
  hasMore: boolean;
};

export function Sidebar(props: SidebarProps) {
  return (
    <InfiniteScroll
      dataLength={props.items.length} //This is important field to render the next data
      next={props.onNext}
      hasMore={props.hasMore}
      loader={<h4>Loading...</h4>}
    >
      <div className={clsx([style.Sidebar])}>
        {props.items.map((item, i) => (
          <SidebarItem key={i} {...item} />
        ))}
      </div>
    </InfiniteScroll>
  );
}
