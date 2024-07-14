import Centered from 'src/components/Centered/Centered'
import PostThread from 'src/components/PostThread/PostThread'

type PostLayoutProps = {
  children?: React.ReactNode
}

const PostLayout = ({ children }: PostLayoutProps) => {
  return (
    <>
      <Centered>
        <PostThread />
      </Centered>

      {children}
    </>
  )
}

export default PostLayout
