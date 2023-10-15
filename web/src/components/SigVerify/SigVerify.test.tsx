import { render } from '@redwoodjs/testing/web'

import SigVerify from './SigVerify'

//   Improve this test with help from the Redwood Testing Doc:
//    https://redwoodjs.com/docs/testing#testing-components

describe('SigVerify', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<SigVerify />)
    }).not.toThrow()
  })
})
