import { render } from '@redwoodjs/testing/web'

import ThreadBody from './ThreadBody'

//   Improve this test with help from the Redwood Testing Doc:
//    https://redwoodjs.com/docs/testing#testing-components

describe('ThreadBody', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<ThreadBody />)
    }).not.toThrow()
  })
})
