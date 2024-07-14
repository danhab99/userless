import PostThread from 'src/components/PostThread/PostThread'

type PostLayoutProps = {
  children?: React.ReactNode
}

const PostLayout = ({ children }: PostLayoutProps) => {
  return (
    <>
      <div className="flex flex-row justify-center px-8 my-8">
        <div className="max-w-4xl flex-grow">
          <PostThread />
        </div>
      </div>

      {children}
    </>
  )
}

export default PostLayout
