import clsx from "clsx";
import style from "./SidebarItem.module.css";
import { useMemo } from "react";
import Markdown from "react-markdown";

export type SidebarItemProps = {
  ownerName: string;
  ownerEmail: string;
  timestamp: Date;

  body: string;
  selected?: boolean;
  onClick?: () => void;
};

const PREVIEW_LINE_LENGTH = 25;

export function SidebarItem(props: SidebarItemProps) {
  const preview = useMemo(() => {
    const b = props.body.trim();

    const firstLineIndex = b.indexOf("\n");
    const secondLineIndex = b.indexOf("\n", firstLineIndex);
    const thirdLineIndex = b.indexOf("\n", secondLineIndex);

    const preview = [
      b.slice(0, Math.min(firstLineIndex, PREVIEW_LINE_LENGTH)),
      b.slice(secondLineIndex, Math.min(PREVIEW_LINE_LENGTH, thirdLineIndex)),
    ];

    return preview.join("\n");
  }, [props.body]);

  return (
    <div
      className={clsx([
        style.SidebarItem,
        "bg-gray-100 p-4 r-2 rounded-lg cursor-pointer border border-transparent",
        props.selected && "border-blue-500 bg-blue-50",
      ])}
      onClick={props.onClick}
    >
      <div className="text-xs">
        <span className="text-red-600">{props.ownerName}</span>
        {"<"}
        <span className="text-green-600">{props.ownerEmail}</span>
        {"> on "}
        <span className="text-blue-600">
          {props.timestamp.toLocaleString()}
        </span>
      </div>

      <Markdown>{preview}</Markdown>
    </div>
  );
}
