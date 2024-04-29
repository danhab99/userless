import { Link, routes, useParams } from '@redwoodjs/router'
import { Metadata } from '@redwoodjs/web'
import ThreadCell from 'src/components/ThreadCell'

const ThreadPage = () => {
  const { threadhash } = useParams()

  return (
    <>
      <Metadata title="Thread" description="Thread page" />

      <ThreadCell threadHash={threadhash} />
    </>
  )
}

export default ThreadPage
