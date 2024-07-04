import { render } from '@redwoodjs/testing/web'

import RegisterKeyPage from './RegisterKeyPage'

//   Improve this test with help from the Redwood Testing Doc:
//   https://redwoodjs.com/docs/testing#testing-pages-layouts

describe('RegisterKeyPage', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<RegisterKeyPage />)
    }).not.toThrow()
  })
})
