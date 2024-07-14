import type { Meta, StoryObj } from '@storybook/react'

import PostLayout from './PostLayout'

const meta: Meta<typeof PostLayout> = {
  component: PostLayout,
}

export default meta

type Story = StoryObj<typeof PostLayout>

export const Primary: Story = {}
