import { useState, useEffect } from 'react'

export function useAsyncMemo<T>(
  handler: () => Promise<T>,
  deps: any[]
): T | undefined {
  const [val, setVal] = useState<T | undefined>(undefined)

  useEffect(() => {
    handler().then((x) => setVal(x))
  }, deps)

  return val
}
