import { render } from '@redwoodjs/testing/web'

import GenerateKeyPage from './GenerateKeyPage'

//   Improve this test with help from the Redwood Testing Doc:
//   https://redwoodjs.com/docs/testing#testing-pages-layouts

describe('GenerateKeyPage', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<GenerateKeyPage />)
    }).not.toThrow()
  })
})
