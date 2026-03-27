import type { Meta, StoryObj } from '@storybook/react';
import { Centered } from './Centered';

// More on how to set up stories at:
// https://storybook.js.org/docs/writing-stories#default-export
const meta: Meta<typeof Centered> = {
  title: 'Centered',
  component: Centered,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  args: {},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Test: Story = {
  args: {
    // Add story args here
  }
};
