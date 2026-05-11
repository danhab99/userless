import clsx from "clsx";
import style from "./Sidebar.module.css";
import InfiniteScroll from "react-infinite-scroll-component";
import {
  UserlessSidebarItem,
  type UserlessSidebarItemProps,
} from "../SidebarItem/UserlessSidebarItem";

export type SidebarProps = {
  items: UserlessSidebarItemProps[];
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
          <UserlessSidebarItem key={i} {...item} />
        ))}
      </div>
    </InfiniteScroll>
  );
}
