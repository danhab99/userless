import type { Meta, StoryObj } from '@storybook/react';
import { Comment } from './Comment';

// More on how to set up stories at:
// https://storybook.js.org/docs/writing-stories#default-export
const meta: Meta<typeof Comment> = {
  title: 'Comment',
  component: Comment,
  parameters: {},
  tags: ['autodocs'],
  args: {},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Test: Story = {
  args: {
    ownerEmail: 'user@example.com',
    ownerName: 'John Doe',
    timestamp: Date.now(),
    body: '# This is a test comment!\n\nThis comment demonstrates **markdown** formatting.\n\n## Features\n\n- Bold text with `**bold**`\n- Italic text with `*italic*`\n- Code blocks:\n  ```javascript\n  console.log("Hello World");\n  ```',
    hash: 'abc123def456',
    enableDelete: true,
    replies: [],
  },
};

export const WithReplies: Story = {
  args: {
    ownerEmail: 'user@example.com',
    ownerName: 'Jane Smith',
    timestamp: Date.now(),
    body: '# Great point! I agree with this.\n\n## Discussion\n\n1. First reply about the topic\n2. Second reply with a counterpoint\n3. Third reply with a conclusion\n\n> "Great discussion everyone!"\n\n### Code Example\n\n```typescript\nconst greeting = (name: string): string => {\n  return `Hello ${name}!`;\n};\n```\n\n**Note**: Please review the code above carefully.',
    hash: 'xyz789ghi012',
    enableDelete: true,
    replies: [
      {
        ownerEmail: 'reply@example.com',
        ownerName: 'Bob Johnson',
        timestamp: Date.now() - 3600000,
        body: '# Thanks for the reply!\n\nI agree with this point. Here is my **thoughts**:\n\n- The approach is sound\n- Implementation looks good\n- Testing should be thorough\n\n### Additional Notes\n\nCheck out [this link](https://example.com) for more info.',
        hash: 'reply123',
        enableDelete: false,
        replies: [],
      },
    ],
  },
};

export const ReadOnly: Story = {
  args: {
    ownerEmail: 'user@example.com',
    ownerName: 'Alice Brown',
    timestamp: Date.now(),
    body: '# This comment cannot be deleted.\n\n## Important Notice\n\nThis is a **read-only** comment. No changes will be made.\n\n### Rules\n\n1. Read carefully\n2. Do not edit\n3. Respect others\n\n> "Please do not modify this content."\n\n---\n\n*Last updated: ' + new Date().toLocaleDateString() + '*',
    hash: 'readonly456',
    enableDelete: false,
    replies: [],
  },
};

export const EmptyBody: Story = {
  args: {
    ownerEmail: 'user@example.com',
    ownerName: 'Charlie Wilson',
    timestamp: Date.now(),
    body: '# Empty Body Comment\n\nThis comment has an **empty** body.\n\n## Why?\n\nSometimes we need to test edge cases.\n\n```typescript\nconst emptyString = "";\nconsole.log(emptyString.length); // 0\n```\n\n---\n\n*End of content*',
    hash: 'empty789',
    enableDelete: true,
    replies: [],
  },
};
