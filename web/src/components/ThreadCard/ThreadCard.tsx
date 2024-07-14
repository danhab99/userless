import type { Thread } from 'types/graphql'
import SigVerify from '../SigVerify/SigVerify'
import mailto from 'mailto-link'
import ThreadBody from '../ThreadBody/ThreadBody'
import { Link, routes } from '@redwoodjs/router'
import { registerFragment } from '@redwoodjs/web/apollo'
import { useState } from 'react'
import PostThread from '../PostThread/PostThread'
import { func } from 'prop-types'
import { MakeToggleButton } from '../ToggleButton/ToggleButton'

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
  const [ReplyTB, showReply] = MakeToggleButton(false)
  const [SourceTB, showSource] = MakeToggleButton(false)
  const [FullTB, showFull] = MakeToggleButton(false)

  const mailtoLink = mailto({
    to: thread.signedBy.email,
    body: `Hello ${thread.signedBy.name},

In response to your thread https://${window.location.hostname}/t/${thread.hash}`,
    subject: `RE: https://${window.location.hostname}/t/${thread.hash}`,
  })

  function Controls() {
    return (
      <div className="text-xs">
        <ReplyTB trueLabel="Hide reply" falseLabel="Reply" />
        <SourceTB trueLabel="Hide source" falseLabel="Source" />
        <FullTB trueLabel="Less" falseLabel="More" />
      </div>
    )
  }

  return (
    <div className="my-2 max-w-4xl border border-solid border-black bg-card p-4 font-mono">
      <p className="text-sm">
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

      <Controls />

      <div className={showFull ? 'h-full' : 'max-h-96 overflow-y-auto'}>
        <ThreadBody thread={thread as Thread} />
      </div>

      <Controls />

      {showReply ? <PostThread replyTo={thread} /> : null}
      {showSource ? (
        <pre className="h-40 overflow-auto bg-slate-900 text-xs text-slate-100">
          {thread.body}
        </pre>
      ) : null}
    </div>
  )
}

export default ThreadCard
