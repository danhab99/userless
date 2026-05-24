import clsx from "clsx";
import style from "./FileBrowser.module.css";

export type FileBrowserProps = {};

export function FileBrowser(props: FileBrowserProps) {
  return <div className={clsx([style.FileBrowser])}></div>;
}
