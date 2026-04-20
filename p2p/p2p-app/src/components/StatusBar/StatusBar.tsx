import clsx from "clsx";
import style from "./StatusBar.module.css";
import {
  FaWifi,
  FaDownload,
  FaUpload,
  FaMarkdown,
  FaFile,
  FaKey,
} from "react-icons/fa6";
import prettyBytes from "pretty-bytes";
import abbreviate from "number-abbreviate";

export type StatusBarProps = {
  connectionCount: number;
  uploadSpeed: number;
  downloadSpeed: number;

  threadCount: number;
  threadCountSpeed?: number;

  fileCount: number;
  fileCountSpeed?: number;

  keyCount: number;
  keyCountSpeed?: number;
};

export function StatusBar(props: StatusBarProps) {
  return (
    <div className={clsx([style.StatusBar, "bg-gray-300 p-1 w-full"])}>
      <div className="flex flex-row justify-end content-center leading-none gap-4 text-xs">
        <div className="flex flex-row gap-1">
          <FaWifi />
          {props.connectionCount}
        </div>

        <div className="flex flex-row gap-1">
          <FaUpload />
          {prettyBytes(props.uploadSpeed)}
        </div>

        <div className="flex flex-row gap-1">
          <FaDownload />
          {prettyBytes(props.downloadSpeed)}
        </div>

        {"|"}

        <div className="flex flex-row gap-1">
          <FaMarkdown />
          {abbreviate(props.threadCount)}
          {props.threadCountSpeed ? `(+${props.threadCountSpeed})` : null}
        </div>

        <div className="flex flex-row gap-1">
          <FaFile />
          {abbreviate(props.fileCount)}
          {props.fileCountSpeed ? `(+${props.fileCountSpeed})` : null}
        </div>

        <div className="flex flex-row gap-1">
          <FaKey />
          {abbreviate(props.keyCount)}
          {props.keyCountSpeed ? `(+${props.keyCountSpeed})` : null}
        </div>
      </div>
    </div>
  );
}
