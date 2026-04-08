import type { Meta, StoryObj } from '@storybook/react';
import { StatusBar } from './StatusBar';

// More on how to set up stories at:
// https://storybook.js.org/docs/writing-stories#default-export
const meta: Meta<typeof StatusBar> = {
  title: 'StatusBar',
  component: StatusBar,
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
    connectionCount: 100,
    downloadSpeed: 123091,
    uploadSpeed: 548922,
    fileCount: 100,
    keyCount: 123,
    threadCount: 103,
  }
};
