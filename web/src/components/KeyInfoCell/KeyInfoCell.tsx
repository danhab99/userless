import type { FindKeyInfoQuery, FindKeyInfoQueryVariables } from 'types/graphql'

import type {
  CellSuccessProps,
  CellFailureProps,
  TypedDocumentNode,
} from '@redwoodjs/web'
import Markdown from 'react-markdown'

export const QUERY: TypedDocumentNode<
  FindKeyInfoQuery,
  FindKeyInfoQueryVariables
> = gql`
  query FindKeyInfoQuery($keyId: String!) {
    publicKey(keyId: $keyId) {
      armoredKey
      comment
      email
      finger
      keyId
      name
    }
  }
`

export const Loading = () => <div>Loading...</div>

export const Empty = () => <div>Empty</div>

export const Failure = ({
  error,
}: CellFailureProps<FindKeyInfoQueryVariables>) => (
  <div style={{ color: 'red' }}>Error: {error?.message}</div>
)

export const Success = ({
  publicKey,
}: CellSuccessProps<FindKeyInfoQuery, FindKeyInfoQueryVariables>) => {
  return (
    <div className="px-40">
      <div className="flexflex-col items-center bg-yellow-100 border border-black">
        <h3 className='text-center'>
          {publicKey.name} {'<'}
          {publicKey.email}
          {'>'}
        </h3>
        <p className="py-2">
          <div className="markdown">
            <Markdown>{publicKey.comment}</Markdown>
          </div>
        </p>
        <pre className="h-40 w-full overflow-y-scroll bg-slate-300 p-1 text-xs">
          {publicKey.armoredKey}
        </pre>
      </div>
    </div>
  )
}
