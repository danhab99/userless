import { render } from '@redwoodjs/testing/web'

import PostLayout from './PostLayout'

//   Improve this test with help from the Redwood Testing Doc:
//   https://redwoodjs.com/docs/testing#testing-pages-layouts

describe('PostLayout', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<PostLayout />)
    }).not.toThrow()
  })
})
