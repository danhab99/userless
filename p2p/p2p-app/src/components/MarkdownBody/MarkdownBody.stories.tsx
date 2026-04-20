import type { Meta, StoryObj } from '@storybook/react';
import { MarkdownBody } from './MarkdownBody';

// More on how to set up stories at:
// https://storybook.js.org/docs/writing-stories#default-export
const meta: Meta<typeof MarkdownBody> = {
  title: 'MarkdownBody',
  component: MarkdownBody,
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
    body: `
# this is just a test 

## test

### test

**bold**

*italics*
    `,
  }
};
