import type {
  FindThreadQuery,
  FindThreadQueryVariables,
  Thread,
} from 'types/graphql'
import type { CellSuccessProps, CellFailureProps } from '@redwoodjs/web'
import ThreadCard from '../ThreadCard/ThreadCard'

export const QUERY = gql`
  fragment ThreadFrag on Thread {
    body
    hash
    timestamp
    signedBy {
      comment
      email
      keyId
      name
    }
  }

  query FindThreadQuery($threadHash: String!) {
    thread(threadHash: $threadHash) {
      ...ThreadFrag
      replies {
        ...ThreadFrag
      }
      parent {
        ...ThreadFrag
        parent {
          ...ThreadFrag
          parent {
            ...ThreadFrag
            parent {
              ...ThreadFrag
              parent {
                ...ThreadFrag
              }
            }
          }
        }
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
  var parents: Thread[]
  var current = thread as Thread

  while (current !== undefined) {
    parents.push(current)
    current = current.parent
  }

  return (
    <div>
      {parents.map((thread) => (
        <ThreadCard key={thread.hash} thread={thread} />
      ))}

      <hr />

      <ThreadCard thread={thread as Thread} />

      <ul className="pl-4">
        {thread.replies.map((reply) => (
          <ThreadCard key={reply.hash} thread={reply as Thread} />
        ))}
      </ul>
    </div>
  )
}
