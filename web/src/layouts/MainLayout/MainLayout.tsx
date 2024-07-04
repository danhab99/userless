import PostThread from 'src/components/PostThread/PostThread'

type MainLayoutProps = {
  children?: React.ReactNode
}

const MainLayout = ({ children }: MainLayoutProps) => {
  return (
    <>
      <div className="mb-16">
        <header className="bg-background p-8 text-center">
          <h1>PGChan.gpg</h1>
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
