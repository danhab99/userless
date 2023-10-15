import type { ThreadsQuery } from 'types/graphql'
import type { CellSuccessProps, CellFailureProps } from '@redwoodjs/web'

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

export const Empty = () => <div>Empty</div>

export const Failure = ({ error }: CellFailureProps) => (
  <div style={{ color: 'red' }}>Error: {error?.message}</div>
)

export const Success = ({ threads }: CellSuccessProps<ThreadsQuery>) => {
  return (
    <ul>
      {threads.map((item) => {
        return <li key={item.id}>{JSON.stringify(item)}</li>
      })}
    </ul>
  )
}
