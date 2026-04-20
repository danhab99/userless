import clsx from "clsx";
import style from "./FileCard.module.css";
import { FaFile } from "react-icons/fa6";

export type FileCardProps = {
  name: string;
};

export function FileCard(props: FileCardProps) {
  return <div className={clsx([style.FileCard, "bg-gray-200 p-12 rounded-lg flex flex-col gap-2 content-center text-center"])}>
    <FaFile size={50} className="text-gray-500 mx-auto" />
    <span className="text-gray-700">{props.name}</span>
  </div>;
}
