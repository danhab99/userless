"use client";

export type ActionButtonProps = {
  color?: string;
  label: string;
  onClick?: () => void;
};

export const ActionButton = (props: ActionButtonProps) => {
  return (
    <span
      className={`${props.color ?? "text-green-700"}`}
      onClick={props.onClick}
    >
      [{props.label}]
    </span>
  );
};

