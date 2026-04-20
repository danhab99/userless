import type { Meta, StoryObj } from '@storybook/react';
import { FileCard } from './FileCard';

// More on how to set up stories at:
// https://storybook.js.org/docs/writing-stories#default-export
const meta: Meta<typeof FileCard> = {
  title: 'FileCard',
  component: FileCard,
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
    name: "test_file.md"
  }
};
