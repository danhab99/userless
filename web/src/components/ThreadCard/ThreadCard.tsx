import type { Thread } from 'types/graphql'
import SigVerify from '../SigVerify/SigVerify'
import mailto from 'mailto-link'
import ThreadBody from '../ThreadBody/ThreadBody'
import { Link, routes } from '@redwoodjs/router'
import { registerFragment } from '@redwoodjs/web/apollo'
import { useState } from 'react'
import PostThread from '../PostThread/PostThread'

type ThreadCardProps = {
  thread: Pick<Thread, 'body' | 'hash' | 'signedBy' | 'timestamp'>
}

registerFragment(gql`
  fragment ThreadCard on Thread {
    body
    hash
    timestamp
    signedBy {
      email
      name
      keyId
    }
  }
`)

const ThreadCard = ({ thread }: ThreadCardProps) => {
  const [showReply, setShowReply] = useState(false)
  const [showSource, setShowSource] = useState(false)

  const mailtoLink = mailto({
    to: thread.signedBy.email,
    body: `Hello ${thread.signedBy.name},

In response to your thread https://${window.location.hostname}/t/${thread.hash}`,
    subject: `RE: https://${window.location.hostname}/t/${thread.hash}`,
  })

  return (
    <div className="my-2 max-w-4xl border border-solid border-black bg-card p-4 font-mono">
      <p className="text-xs">
        <span className="text-green-700">
          {new Date(thread.timestamp).toLocaleString()}
        </span>{' '}
        <span className="text-username">
          {thread.signedBy.name}
          <Link to={routes.key({ keyid: thread.signedBy.keyId })}>
            {'('}
            {thread.signedBy.keyId}
            {')'}
          </Link>
          <a href={mailtoLink} target="_blank">
            {'<'}
            {thread.signedBy.email}
            {'>'}
          </a>
        </span>{' '}
        <Link
          className="text-slate-600"
          to={routes.thread({ threadhash: thread.hash })}
        >
          {thread.hash.slice(0, 16)}
        </Link>{' '}
        <SigVerify thread={thread as Thread} />
      </p>

      <ThreadBody thread={thread as Thread} />

      <div>
        <a
          onClick={() => setShowReply(x => !x)}
          className="text-xs text-green-800"
        >
          [Reply]
        </a>
        <a
          onClick={() => setShowSource(x => !x)}
          className="text-xs text-green-800"
        >
          [Source]
        </a>
      </div>

      {showReply ? <PostThread replyTo={thread} /> : null}
      {showSource ? <pre className="text-slate-100 bg-slate-900 overflow-scroll text-xs h-40">{thread.body}</pre> : null}
    </div>
  )
}

export default ThreadCard
