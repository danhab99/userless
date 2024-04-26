import { Link, routes } from '@redwoodjs/router'
import { MetaTags } from '@redwoodjs/web'
import PostThread from 'src/components/PostThread/PostThread'
import ThreadsCell from 'src/components/ThreadsCell'

const WelcomePage = () => {
  return (
    <>
      <MetaTags title="Welcome" description="Welcome page" />

      <header className="bg-background p-8 text-center">
        <h1>PGChan.gpg</h1>
        <p>
          PGChan is an activity-pub compliant file board that uses GPG for role
          based access control.
        </p>
      </header>

      <div className="flex flex-row justify-center">
        <PostThread />
      </div>

      <ThreadsCell />
    </>
  )
}

export default WelcomePage
