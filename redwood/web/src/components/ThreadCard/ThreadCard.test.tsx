import { render } from '@redwoodjs/testing/web'

import ThreadCard from './ThreadCard'

//   Improve this test with help from the Redwood Testing Doc:
//    https://redwoodjs.com/docs/testing#testing-components

describe('ThreadCard', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<ThreadCard />)
    }).not.toThrow()
  })
})
