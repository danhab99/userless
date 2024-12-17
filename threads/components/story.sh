cat <<EOF > "$1/$1.stories.tsx"
import type { Meta, StoryObj } from '@storybook/react';
import { $1 } from './$1';

// More on how to set up stories at:
// https://storybook.js.org/docs/writing-stories#default-export
const meta: Meta<typeof $1> = {
  title: '$1',
  component: $1,
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
EOF

