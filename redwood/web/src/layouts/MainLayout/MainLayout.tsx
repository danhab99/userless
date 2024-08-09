import { Link, routes } from '@redwoodjs/router'
import PostThread from 'src/components/PostThread/PostThread'

type MainLayoutProps = {
  children?: React.ReactNode
}

const MainLayout = ({ children }: MainLayoutProps) => {
  return (
    <>
      <div className="mb-16">
        <header className="bg-background p-8 text-center">
          <Link to={routes.welcome()}>
            <h1>PGChan.gpg</h1>
          </Link>
        </header>
        <div className="flex flex-row justify-center">
          <PostThread />
        </div>
      </div>

      <div className="px-8">{children}</div>
    </>
  )
}

export default MainLayout
