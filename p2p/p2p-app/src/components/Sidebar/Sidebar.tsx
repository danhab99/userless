import clsx from "clsx";
import style from "./Sidebar.module.css";
import { SidebarItem, type SidebarItemProps } from "../SidebarItem/SidebarItem";

export type SidebarProps = {
  items: SidebarItemProps[];
};

export function Sidebar(props: SidebarProps) {
  return (
    <div className={clsx([style.Sidebar])}>
      {props.items.map((item, i) => (
        <SidebarItem key={i} {...item} />
      ))}
    </div>
  );
}
