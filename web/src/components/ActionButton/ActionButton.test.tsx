import { render } from '@redwoodjs/testing/web'

import ActionButton from './ActionButton'

//   Improve this test with help from the Redwood Testing Doc:
//    https://redwoodjs.com/docs/testing#testing-components

describe('ActionButton', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<ActionButton />)
    }).not.toThrow()
  })
})
