import type {
  FindThreadQuery,
  FindThreadQueryVariables,
  Thread,
} from 'types/graphql'
import type { CellSuccessProps, CellFailureProps } from '@redwoodjs/web'
import ThreadCard from '../ThreadCard/ThreadCard'

export const QUERY = gql`
  query FindThreadQuery($threadHash: String!) {
    thread(threadHash: $threadHash) {
      ...ThreadCard
      replies {
        ...ThreadCard
      }
      parents {
        ...ThreadCard
      }
    }
  }
`

export const Loading = () => <div>Loading...</div>

export const Empty = () => <div>Empty</div>

export const Failure = ({
  error,
}: CellFailureProps<FindThreadQueryVariables>) => (
  <div style={{ color: 'red' }}>Error: {error?.message}</div>
)

export const Success = ({
  thread,
}: CellSuccessProps<FindThreadQuery, FindThreadQueryVariables>) => {
  return (
    <div>
      {thread.parents.map((thread: Thread) => (
        <ThreadCard key={thread.hash} thread={thread} />
      ))}

      {thread.parents?.length > 0 ? <hr /> : null}

      <ThreadCard thread={thread as Thread} />

      <ul className="pl-4">
        {thread.replies.map((reply) => (
          <ThreadCard key={reply.hash} thread={reply as Thread} />
        ))}
      </ul>
    </div>
  )
}
