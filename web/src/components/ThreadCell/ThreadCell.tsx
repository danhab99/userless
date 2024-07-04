import type {
  FindThreadQuery,
  FindThreadQueryVariables,
  Thread,
} from 'types/graphql'
import type { CellSuccessProps, CellFailureProps } from '@redwoodjs/web'
import ThreadCard from '../ThreadCard/ThreadCard'
import { MakeToggleButton } from '../ToggleButton/ToggleButton'

export const QUERY = gql`
  query FindThreadQuery(
    $threadHash: String!
    $parentsLimit: Int = 10
    $skip: Int = 0
    $limit: Int = 100
  ) {
    thread(threadHash: $threadHash) {
      ...ThreadCard
      replies(skip: $skip, limit: $limit) {
        ...ThreadCard
      }
      parents(limit: $parentsLimit) {
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
  showParentsDef,
  showRepliesDef,
}: CellSuccessProps<FindThreadQuery, FindThreadQueryVariables> & {
  showParentsDef?: boolean
  showRepliesDef?: boolean
}) => {
  const enableShowingParents = typeof showParentsDef === 'boolean'
  const enableShowingReplies = typeof showParentsDef === 'boolean'

  const [ParentTB, showParents] = MakeToggleButton(showParentsDef)
  const [RepliesTB, showReplies] = MakeToggleButton(showRepliesDef)

  return (
    <div>
      {showParents
        ? thread.parents.map((thread: Thread) => (
            <ThreadCard key={thread.hash} thread={thread} />
          ))
        : null}

      {enableShowingParents && thread.parents.length > 0 ? (
        <ParentTB
          color="text-green-700"
          trueLabel="Hide parents"
          falseLabel="Show parents"
        />
      ) : null}

      {thread.parents?.length > 0 && showParents ? (
        <hr />
      ) : null}

      <ThreadCard thread={thread as Thread} />

      {enableShowingReplies && thread.replies.length > 0 ? (
        <RepliesTB
          color="text-green-700"
          trueLabel="Hide replies"
          falseLabel="Show replies"
        />
      ) : null}
      {showReplies ? (
        <ul className="pl-4">
          {thread.replies.map((reply) => (
            <ThreadCard key={reply.hash} thread={reply as Thread} />
          ))}
        </ul>
      ) : null}
    </div>
  )
}
