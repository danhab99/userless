// Pass props to your component by passing an `args` object to your story
//
// ```tsx
// export const Primary: Story = {
//  args: {
//    propName: propValue
//  }
// }
// ```
//
// See https://storybook.js.org/docs/react/writing-stories/args.

import type { Meta, StoryObj } from '@storybook/react'

import SigVerify from './SigVerify'

const meta: Meta<typeof SigVerify> = {
  component: SigVerify,
}

export default meta

type Story = StoryObj<typeof SigVerify>

export const Primary: Story = {}
