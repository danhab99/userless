import type { Thread } from 'types/graphql'
import SigVerify from '../SigVerify/SigVerify'
import mailto from 'mailto-link'
import ThreadBody from '../ThreadBody/ThreadBody'

type ThreadCardProps = {
  thread: Pick<Thread, 'body' | 'hash' | 'signedBy' | 'timestamp' | 'signature'>
}

export const ThreadQueryFrag = gql`
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
`

const ThreadCard = ({ thread }: ThreadCardProps) => {
  return (
    <div className="rounded bg-card p-4 font-mono ">
      <p className="text-xs">
        <span className="text-green-700">
          {new Date(thread.timestamp).toUTCString()}
        </span>{' '}
        <span className="text-username">
          {thread.signedBy.name}
          <a
            href={mailto({
              to: thread.signedBy.email,
            })}
          >
            {'<'}
            {thread.signedBy.email}
            {'>'}
          </a>
        </span>{' '}
        <span className="text-hash">{thread.hash}</span>
        <SigVerify thread={thread as Thread} />
      </p>
      <div className="flex flex-row justify-start">
        <ThreadBody thread={thread as Thread} />
      </div>
    </div>
  )
}

export default ThreadCard
