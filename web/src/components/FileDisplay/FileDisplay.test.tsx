import { render } from '@redwoodjs/testing/web'

import FileDisplay from './FileDisplay'

//   Improve this test with help from the Redwood Testing Doc:
//    https://redwoodjs.com/docs/testing#testing-components

describe('FileDisplay', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<FileDisplay />)
    }).not.toThrow()
  })
})
