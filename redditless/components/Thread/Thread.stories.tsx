import type { Meta, StoryObj } from '@storybook/react';
import { Thread } from './Thread';

// More on how to set up stories at:
// https://storybook.js.org/docs/writing-stories#default-export
const meta: Meta<typeof Thread> = {
  title: 'Thread',
  component: Thread,
  parameters: {},
  tags: ['autodocs'],
  args: {},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Test: Story = {
  args: {
    hash: 'test-thread-123',
    body: '# This is a test thread!\n\nThis thread demonstrates **markdown** formatting.\n\n## Features\n\n- Bold text with `**bold**`\n- Italic text with `*italic*`\n- Code blocks:\n  ```javascript\n  console.log("Hello World");\n  ```',
    ownerEmail: 'user@example.com',
    ownerName: 'John Doe',
    timestamp: Date.now(),
    replies: [],
    enableDelete: true,
  },
};

export const WithReplies: Story = {
  args: {
    hash: 'thread-with-replies-456',
    body: '# This thread has several replies!\n\n## Discussion\n\n1. First reply about the topic\n2. Second reply with a counterpoint\n3. Third reply with a conclusion\n\n> "Great discussion everyone!"\n\n### Code Example\n\n```typescript\nconst greeting = (name: string): string => {\n  return `Hello ${name}!`;\n};\n```\n\n**Note**: Please review the code above carefully.',
    ownerEmail: 'user@example.com',
    ownerName: 'Jane Smith',
    timestamp: Date.now(),
    replies: [
      {
        ownerEmail: 'reply1@example.com',
        ownerName: 'Bob Johnson',
        timestamp: Date.now() - 3600000,
        body: '# Thanks for the reply!\n\nI agree with this point. Here is my **thoughts**:\n\n- The approach is sound\n- Implementation looks good\n- Testing should be thorough\n\n### Additional Notes\n\nCheck out [this link](https://example.com) for more info.',
        hash: 'reply-1',
        enableDelete: false,
        replies: [],
        onDelete: () => {}
      },
      {
        ownerEmail: 'reply2@example.com',
        ownerName: 'Alice Brown',
        timestamp: Date.now() - 7200000,
        body: '# I agree with this.\n\nThis is a **great** point! Let me add some details:\n\n## Key Points\n\n1. Security first\n2. Performance matters\n3. User experience is key\n\n> "Well said!"\n\n```bash\nnpm install express\n```\n\nSee you at the next meeting!',
        hash: 'reply-2',
        enableDelete: false,
        replies: [],
        onDelete: () => {}
      },
    ],
    enableDelete: true,
  },
};

export const ReadOnly: Story = {
  args: {
    hash: 'readonly-thread-789',
    body: '# This thread cannot be deleted.\n\n## Important Notice\n\nThis is a **read-only** thread. No changes will be made.\n\n### Rules\n\n1. Read carefully\n2. Do not edit\n3. Respect others\n\n> "Please do not modify this content."\n\n---\n\n*Last updated: ' + new Date().toLocaleDateString() + '*',
    ownerEmail: 'user@example.com',
    ownerName: 'Charlie Wilson',
    timestamp: Date.now(),
    replies: [],
    enableDelete: false,
  },
};

export const EmptyBody: Story = {
  args: {
    hash: 'empty-thread-012',
    body: '# Empty Body Thread\n\nThis thread has an **empty** body.\n\n## Why?\n\nSometimes we need to test edge cases.\n\n```typescript\nconst emptyString = "";\nconsole.log(emptyString.length); // 0\n```\n\n---\n\n*End of content*',
    ownerEmail: 'user@example.com',
    ownerName: 'Dave Miller',
    timestamp: Date.now(),
    replies: [],
    enableDelete: true,
  },
};

export const WithPolicy: Story = {
  args: {
    hash: 'thread-with-policy-345',
    body: '# This thread has a policy attached.\n\n## Policy Details\n\n- **Visible**: Yes\n- **Accepts Replies**: Yes\n- **Encrypt For**: None\n- **Policy Editors**: Admin only\n- **Advertise**: No\n\n### Configuration\n\n```json\n{\n  "visible": true,\n  "acceptsReplies": true,\n  "encryptFor": [],\n  "policyEditors": ["admin@example.com"],\n  "advertise": false\n}\n```\n\n> "Policy is enforced automatically."\n\n---\n\n*See [documentation](https://docs.example.com) for more*',
    ownerEmail: 'user@example.com',
    ownerName: 'Eve Davis',
    timestamp: Date.now(),
    replies: [],
    enableDelete: true,
  },
};

export const EncryptedThread: Story = {
  args: {
    hash: 'encrypted-thread-678',
    body: '# This thread is encrypted for specific recipients.\n\n## Security Notice\n\nThis content is **encrypted** and only visible to authorized users.\n\n### Recipients\n\n1. recipient1@example.com\n2. recipient2@example.com\n3. recipient3@example.com\n\n```javascript\nconst recipients = [\n  "recipient1@example.com",\n  "recipient2@example.com",\n];\n```\n\n> "Encryption ensures privacy."\n\n---\n\n*Key management is critical*',
    ownerEmail: 'user@example.com',
    ownerName: 'Frank Green',
    timestamp: Date.now(),
    replies: [],
    enableDelete: true,
    // encryptFor: ['recipient1@example.com', 'recipient2@example.com'],
  },
};

export const AdvertisedThread: Story = {
  args: {
    hash: 'advertised-thread-901',
    body: '# This thread is advertised publicly.\n\n## Public Notice\n\nThis thread is **advertised** and visible to all users.\n\n### Features\n\n- ✅ Public visibility\n- ✅ Open discussion\n- ✅ Community engagement\n\n```markdown\n# Welcome!\n\nJoin our community today.\n```\n\n> "Transparency builds trust."\n\n---\n\n*Visit [our website](https://example.com) for more*',
    ownerEmail: 'user@example.com',
    ownerName: 'Grace White',
    timestamp: Date.now(),
    replies: [],
    enableDelete: true,
    // advertise: true,
  },
};

export const ThreadWithFiles: Story = {
  args: {
    hash: 'thread-with-files-234',
    body: `# This thread has attached files.\n\n## File Attachments\n\n### Files Available\n\n1. **file-1.png** (512 KB)\n   - Image file\n   - Uploaded by key-123\n\n2. **file-2.pdf** (1 MB)\n   - Document\n   - Confidential\n\n'''typescript\nconst files = [\n  {\n    hash: 'file-1',\n    mimeType: 'image/png',\n    size: 1024 * 512,\n    signedById: 'key-123',\n  },\n];\n'''\n\n> "Always verify file signatures."\n\n---\n\n*Storage: S3 bucket*`,
    ownerEmail: 'user@example.com',
    ownerName: 'Henry Black',
    timestamp: Date.now(),
    replies: [],
    enableDelete: true,
  },
};
