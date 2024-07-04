import { useAsyncMemo } from 'src/useAsyncMemo'
import { Thread } from 'types/graphql'
import * as openpgp from 'openpgp'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
// import * as syntax_highlight from 'highlight.js/lib/languages/*';

type ThreadBodyProps = {
  thread: Thread
}

const ThreadBody = (props: ThreadBodyProps) => {
  const body = useAsyncMemo(async () => {
    const msg = await openpgp.readCleartextMessage({
      cleartextMessage: props.thread.body,
    })

    var body = msg.getText()
    if (body.startsWith('replyTo:')) {
      body = body.slice(body.indexOf('\n'))
    }

    return body
  }, [props.thread])

  return (
    <div className="markdown py-4">
      <Markdown
        remarkPlugins={[remarkGfm]}
        // rehypePlugins={[rehypeHighlight, { languages: syntax_highlight.default }]}
      >
        {body}
      </Markdown>
    </div>
  )
}

export default ThreadBody
