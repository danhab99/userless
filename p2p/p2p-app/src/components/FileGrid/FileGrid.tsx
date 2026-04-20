import clsx from "clsx";
import style from "./FileGrid.module.css";
import { FileCard, type FileCardProps } from "../FileCard/FileCard";

export type FileGridProps = {
  files: FileCardProps[],
};

export function FileGrid(props: FileGridProps) {
  return <div className={clsx([style.FileGrid, "flex flex-row content-center justify-start gap-3 flex-wrap"])}>
    {props.files.map((file) => <FileCard key={file.name} {...file} />)}
  </div>;
}
