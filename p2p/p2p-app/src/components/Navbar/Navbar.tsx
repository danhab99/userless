import clsx from "clsx";
import style from "./Navbar.module.css";
import { ActionButton } from "@userless/ui-components";
import type { Dispatch, SetStateAction, useState } from "react";

export type Page = "threads" | "keys" | "files" | "log";

export type NavbarProps = {
  s: [Page, Dispatch<SetStateAction<Page>>];
};

export function Navbar(props: NavbarProps) {
  const [page, setPage] = props.s;

  return (
    <nav className="base16-default-dark bg-300">
      <ActionButton label="Threads" onClick={() => setPage("threads")} />
      <ActionButton label="Keys" onClick={() => setPage("keys")} />
      <ActionButton label="Files" onClick={() => setPage("files")} />
      <ActionButton label="Log" onClick={() => setPage("log")} />
    </nav>
  );
}
