import { type ResolvedThread } from "../../lib/userless";
import { createStateContext } from "react-use";

const [useSelectedThread, SelectedThreadProvider] = createStateContext<
  ResolvedThread | undefined
>(undefined);

export { useSelectedThread };

export function ThreadProvider(props: React.PropsWithChildren<{}>) {
  return <SelectedThreadProvider>{props.children}</SelectedThreadProvider>;
}
