import { render } from '@redwoodjs/testing/web'

import PostThread from './PostThread'

//   Improve this test with help from the Redwood Testing Doc:
//    https://redwoodjs.com/docs/testing#testing-components

describe('PostThread', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<PostThread />)
    }).not.toThrow()
  })
})
