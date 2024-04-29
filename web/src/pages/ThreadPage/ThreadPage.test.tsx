import { render } from '@redwoodjs/testing/web'

import ThreadPage from './ThreadPage'

//   Improve this test with help from the Redwood Testing Doc:
//   https://redwoodjs.com/docs/testing#testing-pages-layouts

describe('ThreadPage', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<ThreadPage />)
    }).not.toThrow()
  })
})
