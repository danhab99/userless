import { render } from '@redwoodjs/testing/web'

import Centered from './Centered'

//   Improve this test with help from the Redwood Testing Doc:
//    https://redwoodjs.com/docs/testing#testing-components

describe('Centered', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<Centered />)
    }).not.toThrow()
  })
})
