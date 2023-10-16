import { render } from '@redwoodjs/testing/web'

import KeyContext from './KeyContext'

//   Improve this test with help from the Redwood Testing Doc:
//    https://redwoodjs.com/docs/testing#testing-components

describe('KeyContext', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<KeyContext />)
    }).not.toThrow()
  })
})
