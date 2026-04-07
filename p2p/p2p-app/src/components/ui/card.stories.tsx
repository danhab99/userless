import type { Meta, StoryObj } from '@storybook/react'
import { Card } from './card'

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  tags: ['autodocs'],
}

export default meta

export const Default: StoryObj<typeof Card> = {
  args: {
    children: (
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-white">Card preview</h2>
        <p className="text-sm text-slate-300">This card uses the shadcn-style Card component.</p>
      </div>
    ),
  },
}
