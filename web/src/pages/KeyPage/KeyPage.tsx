import { Link, routes, useParams } from '@redwoodjs/router'
import { Metadata } from '@redwoodjs/web'
import ThreadsCell from 'src/components/ThreadsCell'
import KeyInfoCell from 'src/components/KeyInfoCell'

const KeyPage = () => {
  const { keyid } = useParams()

  return (
    <>
      <Metadata title="Key" description="Key page" />

      <KeyInfoCell keyId={keyid} />

      <ThreadsCell key={keyid} />
    </>
  )
}

export default KeyPage
