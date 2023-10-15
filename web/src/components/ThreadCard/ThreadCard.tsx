import { Link } from '@redwoodjs/router'
import type { Thread } from 'api/types/graphql'
import FileDisplay from '../FileDisplay/FileDisplay'

type ThreadCardProps = {
  thread: Pick<Thread, "body" | "files" | "hash" | "signedBy" | "timestamp">
}

const ThreadCard = ({ thread }: ThreadCardProps) => {
  return (
    <div className="rounded bg-card p-4 font-mono ">
      <p className="text-xs">
        <span className="text-green-700">
          {new Date(thread.timestamp).toUTCString()}
        </span>{' '}
        <Link>
          <span className="text-username">
            {thread.signedBy.name}
            {'<'}
            {thread.signedBy.email}
            {'>'}
          </span>
        </Link>{' '}
        <span className="text-hash">{thread.hash}</span>
      </p>
      <div className="flex flex-row justify-start">
        <div className="h-full p-4">
          <FileDisplay files={thread.files} />
        </div>
        <div>
          <p>{thread.body}</p>
        </div>
      </div>
    </div>
  )
}

export default ThreadCard
