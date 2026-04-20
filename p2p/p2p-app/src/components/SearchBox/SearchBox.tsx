import clsx from "clsx";
import style from "./SearchBox.module.css";

export type SearchBoxProps = {};

export function SearchBox(_: SearchBoxProps) {
  return <div className={clsx([style.SearchBox])}></div>;
}
