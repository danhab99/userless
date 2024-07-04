export type ActionButtonProps = {
  color?: string
  label: string
  onClick: () => void
}

const ActionButton = (props: ActionButtonProps) => {
  return (
    <a className={`text-xs text-green-700`} onClick={props.onClick}>
      [{props.label}]
    </a>
  )
}

export default ActionButton
