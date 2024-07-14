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

import Centered from './Centered'

const meta: Meta<typeof Centered> = {
  component: Centered,
  tags: ['autodocs'],
}

export default meta

type Story = StoryObj<typeof Centered>

export const Primary: Story = {}
