"use client";
export type ActionButtonProps = {
  color?: string
  label: string
  onClick?: () => void
}

const ActionButton = (props: ActionButtonProps) => {
  return (
    <a
      className={`${props.color ?? 'text-green-700'}`}
      onClick={props.onClick}
    >
      [{props.label}]
    </a>
  )
}

export default ActionButton
