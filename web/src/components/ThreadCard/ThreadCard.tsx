import type { Thread } from 'types/graphql'
import SigVerify from '../SigVerify/SigVerify'
import mailto from 'mailto-link'
import ThreadBody from '../ThreadBody/ThreadBody'
import { Link, routes } from '@redwoodjs/router'
import { registerFragment } from '@redwoodjs/web/apollo'

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
      finger
    }
  }
`)

const ThreadCard = ({ thread }: ThreadCardProps) => {
  const mailtoLink = mailto({
    to: thread.signedBy.email,
    body: `Hello ${thread.signedBy.name},

In response to your thread https://${window.location.hostname}/t/${thread.hash}`,
    subject: `RE: https://${window.location.hostname}/t/${thread.hash}`,
  })
  return (
    <div className="max-w-4xl border border-solid border-black bg-card p-4 font-mono">
      <p className="text-xs">
        <span className="text-green-700">
          {new Date(thread.timestamp).toUTCString()}
        </span>{' '}
        <span className="text-username">
          {thread.signedBy.name}
          <a href={mailtoLink} target="_blank">
            {'<'}
            {thread.signedBy.email}
            {'>'}
          </a>
        </span>
      </p>
      <p className="text-xs">
        <Link to={routes.thread({ threadhash: thread.hash })}>
          {thread.hash}
        </Link>{' '}
        <SigVerify thread={thread as Thread} />
      </p>
      <ThreadBody thread={thread as Thread} />
    </div>
  )
}

export default ThreadCard
