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

export const Success = (props: CellSuccessProps<FindThreadQuery, FindThreadQueryVariables> & {
  showParentsDef?: boolean
  showRepliesDef?: boolean
  enableShowingParents?: boolean
  enableShowingReplies?: boolean
}) => {

  const [ParentTB, showParents] = MakeToggleButton(props.showParentsDef)
  const [RepliesTB, showReplies] = MakeToggleButton(props.showRepliesDef)

  return (
    <div>
      <div className="flex flex-col-reverse">
      {showParents
        ? props.thread.parents.map((thread: Thread) => (
          <ThreadCard key={thread.hash} thread={thread} />
        ))
      : null}
      </div>

      {props.enableShowingParents && props.thread.parents.length > 0 ? (
        <ParentTB
          color="text-green-700"
          trueLabel="Hide parents"
          falseLabel="Show parents"
        />
      ) : null}

      {props.thread.parents?.length > 0 && showParents ? (
        <hr />
      ) : null}

      <ThreadCard thread={props.thread as Thread} />

      {props.enableShowingReplies && props.thread.replies.length > 0 ? (
        <RepliesTB
          color="text-green-700"
          trueLabel="Hide replies"
          falseLabel="Show replies"
        />
      ) : null}
      {showReplies ? (
        <ul className="pl-4">
          {props.thread.replies.map((reply) => (
            <ThreadCard key={reply.hash} thread={reply as Thread} />
          ))}
        </ul>
      ) : null}
    </div>
  )
}
