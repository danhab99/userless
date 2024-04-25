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

import PostThread from './PostThread'

const meta: Meta<typeof PostThread> = {
  component: PostThread,
}

export default meta

type Story = StoryObj<typeof PostThread>

export const Primary: Story = {}
