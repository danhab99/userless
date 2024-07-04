import { render } from '@redwoodjs/testing/web'

import KeyPage from './KeyPage'

//   Improve this test with help from the Redwood Testing Doc:
//   https://redwoodjs.com/docs/testing#testing-pages-layouts

describe('KeyPage', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<KeyPage />)
    }).not.toThrow()
  })
})
