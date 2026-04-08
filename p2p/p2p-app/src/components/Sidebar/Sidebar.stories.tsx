import type { Meta, StoryObj } from '@storybook/react';
import { Sidebar } from './Sidebar';

// More on how to set up stories at:
// https://storybook.js.org/docs/writing-stories#default-export
const meta: Meta<typeof Sidebar> = {
  title: 'Sidebar/Sidebar',
  component: Sidebar,
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
