import type { File } from 'api/types/graphql'
import { useCallback, useState } from 'react'

type FileDisplayProps = {
  files: File[]
}

const FileDisplay = ({ files }: FileDisplayProps) => {
  const [index, setIndex] = useState(0)
  const file = files[index]

  var display: React.ReactNode

  if (file.mimeType.startsWith('image/')) {
    display = (
      <a target="_blank" href={file.url}>
        <img src={file.url} className="w-full max-w-xs" />
      </a>
    )
  } else if (file.mimeType.startsWith('video/')) {
    display = <video src={file.url} />
  } else {
    display = (
      <a download href={file.url}>
        [Download]
      </a>
    )
  }

  const change = useCallback(
    (dir: -1 | 1) => {
      setIndex((i) => {
        debugger
        var n = i + dir
        if (n < 0) {
          n = files.length - 1
        } else if (n >= files.length) {
          n = 0
        }
        return n
      })
    },
    [setIndex, files]
  )

  return (
    <>
      {display}
      <div className="flex flex-row justify-between text-xs py-1">
        {index != 0 ? (
          <button onClick={() => change(-1)}>{'[<=]'}</button>
        ) : null}
        <a target="_blank" href={file.url}>
          [Open]
        </a>
        {index < files.length - 1 ? (
          <button onClick={() => change(1)}>{'[=>]'}</button>
        ) : null}
      </div>
    </>
  )
}

export default FileDisplay
