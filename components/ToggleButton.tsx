"use client";
import { useState } from "react";
import ActionButton from "@/components/ActionButton";

export type ToggleButtonProps = {
  falseLabel?: string;
  trueLabel?: string;
};

export function MakeToggleButton(
  initialState: boolean = false,
): [React.ElementType<ToggleButtonProps>, boolean] {
  const [state, setState] = useState(initialState);

  const ToggleButton = (props: ToggleButtonProps) => {
    return (
      <ActionButton
        label={(state ? props.trueLabel : props.falseLabel) ?? ""}
        onClick={() => setState((x) => !x)}
      />
    );
  };

  return [ToggleButton, state];
}
