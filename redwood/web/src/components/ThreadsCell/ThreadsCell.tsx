import type { Thread, ThreadsQuery } from 'types/graphql'
import type { CellSuccessProps, CellFailureProps } from '@redwoodjs/web'
import ThreadCard from '../ThreadCard/ThreadCard'
import ThreadCell from '../ThreadCell'

export const QUERY = gql`
  query ThreadsQuery($skip: Int, $limit: Int) {
    threads(skip: $skip, limit: $limit) {
      hash
    }
  }
`

export const Loading = () => <div>Loading...</div>

// export const Empty = () => <div>Empty</div>

export const Failure = ({ error }: CellFailureProps) => (
  <div style={{ color: 'red' }}>Error: {error?.message}</div>
)

export const Success = ({ threads }: CellSuccessProps<ThreadsQuery>) => {
  return (
    <ul>
      {threads.map((item, i) => {
        return (
          <li key={item.hash} className="p-2">
            <ThreadCell parentsLimit={0} threadHash={item.hash} key={i} />
          </li>
        )
      })}
    </ul>
  )
}
