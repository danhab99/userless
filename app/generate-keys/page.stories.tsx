import type { Meta, StoryObj } from '@storybook/react'

import GenerateKeyPage from './GenerateKeyPage'

const meta: Meta<typeof GenerateKeyPage> = {
  component: GenerateKeyPage,
}

export default meta

type Story = StoryObj<typeof GenerateKeyPage>

export const Primary: Story = {}
