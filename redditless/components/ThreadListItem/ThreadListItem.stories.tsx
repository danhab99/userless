import type { Meta, StoryObj } from '@storybook/react';
import { ThreadListItem } from './ThreadListItem';

// More on how to set up stories at:
// https://storybook.js.org/docs/writing-stories#default-export
const meta: Meta<typeof ThreadListItem> = {
  title: 'ThreadListItem',
  component: ThreadListItem,
  parameters: {},
  tags: ['autodocs'],
  args: {},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  args: {
    ownerName: 'John Doe',
    timestamp: Date.now(),
    hash: 'thread-basic-123',
    body: '# Welcome to the discussion!\n\nThis is a basic thread example with some content.',
  },
};

export const LongTitle: Story = {
  args: {
    ownerName: 'Alice Johnson',
    timestamp: Date.now() - 3600000,
    hash: 'thread-long-456',
    body: '# This is a very long thread title that might wrap to multiple lines depending on the container width\n\nThe content discusses various aspects of the topic at hand.',
  },
};

export const ShortTitle: Story = {
  args: {
    ownerName: 'Bob Smith',
    timestamp: Date.now() - 7200000,
    hash: 'thread-short-789',
    body: '# Short\n\nBrief discussion.',
  },
};

export const NoHashSymbol: Story = {
  args: {
    ownerName: 'Jane Wilson',
    timestamp: Date.now() - 86400000,
    hash: 'thread-no-hash-012',
    body: 'Thread without hash symbol at start\n\nThis thread title doesn\'t start with a # symbol.',
  },
};

export const TechnicalDiscussion: Story = {
  args: {
    ownerName: 'DevExpert42',
    timestamp: Date.now() - 1800000,
    hash: 'thread-tech-345',
    body: '# Bug Report: Memory leak in React component\n\nDiscussing performance issues and potential solutions for component optimization.',
  },
};

export const CommunityThread: Story = {
  args: {
    ownerName: 'CommunityMod',
    timestamp: Date.now() - 10800000,
    hash: 'thread-community-678',
    body: '# Weekly Community Update - March 2026\n\nSharing the latest news, updates, and upcoming events for our community members.',
  },
};

export const QuestionThread: Story = {
  args: {
    ownerName: 'NewUser123',
    timestamp: Date.now() - 5400000,
    hash: 'thread-question-901',
    body: '# How do I get started with this project?\n\nI\'m new here and looking for guidance on the best practices and setup instructions.',
  },
};
