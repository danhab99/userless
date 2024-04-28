import { useAsyncMemo } from 'src/useAsyncMemo'
import { Thread } from 'types/graphql'
import * as openpgp from 'openpgp'
import Markdown from 'react-markdown'

type ThreadBodyProps = {
  thread: Thread
}

const ThreadBody = (props: ThreadBodyProps) => {
  const body = useAsyncMemo(async () => {
    const msg = await openpgp.readCleartextMessage({
      cleartextMessage: props.thread.body,
    })

    return msg.getText()
  }, [props.thread])

  return (
    <div className="markdown">
      <Markdown>{body}</Markdown>
    </div>
  )
}

export default ThreadBody
