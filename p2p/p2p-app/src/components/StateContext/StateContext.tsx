import clsx from "clsx";
import style from "./StateContext.module.css";

export type StateContextProps = {};

export function StateContext(props: React.PropsWithChildren<StateContextProps>) {
  return <div className={clsx([style.StateContext])}>
    {props.children}
  </div>
}
