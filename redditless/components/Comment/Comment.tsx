import clsx from "clsx";
import style from "./Comment.module.css";
import Markdown from "react-markdown";
import {createContext, useContext} from "react";


export type CommentProps = {
  ownerEmail: string;
  ownerName: string;
  timestamp: number;
  body: string;
  hash: string;

  enableDelete: boolean;
  replies: CommentProps[]

  onDelete: () => void
};

const DepthContext = createContext(0)

const MAX_COLOR = 6;

export function Comment(props: CommentProps) {
  const depth = useContext(DepthContext);

  return (<DepthContext.Provider value={depth + 1}>
    <div className={clsx([style.Comment, style[`side-${depth % MAX_COLOR}`]])}>
      <div>
        <small>
          <span>{props.ownerName}</span>
          {" "}
          <span>({new Date(props.timestamp).toLocaleString()})</span>
          {" "}
          <span>({props.hash})</span>
        </small>

        <Markdown>{props.body}</Markdown>

        <div className={clsx([style.button_row])}>
          <button className={clsx([style.button])}>Reply</button>
          {props.enableDelete ? <button onClick={props.onDelete} className={clsx([style.button])}>Delete</button> : null}
        </div>
      </div>
    </div>

    {props.replies?.length > 0 ? <div className="pl-2">
      {props.replies.map(reply => <Comment {...reply} />)}
    </div> : null }
  </DepthContext.Provider>);
}
