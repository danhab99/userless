import type { Meta, StoryObj } from '@storybook/react'

import NavbarLayout from './NavbarLayout'

const meta: Meta<typeof NavbarLayout> = {
  component: NavbarLayout,
}

export default meta

type Story = StoryObj<typeof NavbarLayout>

export const Primary: Story = {}
