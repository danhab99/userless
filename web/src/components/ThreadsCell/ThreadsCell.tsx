import type { Thread, ThreadsQuery } from 'types/graphql'
import type { CellSuccessProps, CellFailureProps } from '@redwoodjs/web'
import ThreadCard from '../ThreadCard/ThreadCard'

export const QUERY = gql`
  query ThreadsQuery {
    threads {
      body
      files {
        mimeType
        hash
        url
      }
      hash
      signature
      timestamp
      approved
      signedBy {
        comment
        email
        keyId
        name
      }
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
      {threads.map((item) => {
        return <li key={item.hash}><ThreadCard thread={item as Thread} /></li>
      })}
    </ul>
  )
}
