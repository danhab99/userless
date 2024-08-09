import type { Meta, StoryObj } from '@storybook/react'

import ThreadPage from './ThreadPage'

const meta: Meta<typeof ThreadPage> = {
  component: ThreadPage,
}

export default meta

type Story = StoryObj<typeof ThreadPage>

export const Primary: Story = {}
