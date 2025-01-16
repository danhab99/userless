"use client";
import { useMasterKey } from "../KeyContext/KeyContext";
import { ActionButton } from "../ActionButton/ActionButton";
import {  useAsyncFn } from "react-use";
import * as openpgp from "openpgp";
import toml from "smol-toml";

type AdminActionProps = {
  hash: string;
  newPolicy: Record<string, any>;
  label: string;
  loadingLabel: string;
  onClick: () => void;
  color: string;
};

export function AdminAction(props: AdminActionProps) {
  const master = useMasterKey();

  const [{ loading }, trigger] = useAsyncFn(async () => {
    if (master) {
      const packet = await openpgp.sign({
        message: await openpgp.createCleartextMessage({
          text: toml.stringify(props.newPolicy),
        }),
        signingKeys: master,
      });

      const resp = await fetch(
        `${process.env["NEXT_PUBLIC_USERLESS_URL"]}/thread/${props.hash}/policy`,
        {
          method: "PATCH",
          body: packet,
        },
      );

      await new Promise((r) => setTimeout(r, 50));

      props.onClick();

      return resp.ok;
    }
    return false;
  });

  return (
    <ActionButton
      color={`text-${props.color}-500`}
      label={loading ? props.loadingLabel : props.label}
      onClick={trigger}
    />
  );
}
