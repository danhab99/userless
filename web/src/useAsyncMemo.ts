import { useState, useEffect } from "react";

export function useAsyncMemo<T>(handler: () => Promise<T>, deps: any[]) {
  const [val, setVal] = useState<T | undefined>();

  useEffect(() => {
    handler().then(x => setVal(x))
  }, deps)

  return val
}
