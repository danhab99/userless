import { Link, routes } from '@redwoodjs/router'
import { Metadata } from '@redwoodjs/web'

const ThreadPage = () => {
  return (
    <>
      <Metadata title="Thread" description="Thread page" />

      <h1>ThreadPage</h1>
      <p>
        Find me in <code>./web/src/pages/ThreadPage/ThreadPage.tsx</code>
      </p>
      <p>
        My default route is named <code>thread</code>, link to me with `
        <Link to={routes.thread()}>Thread</Link>`
      </p>
    </>
  )
}

export default ThreadPage
