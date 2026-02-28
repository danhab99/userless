import type { Meta, StoryObj } from "@storybook/react";
import { PostThread } from "./PostThread";

const meta: Meta<typeof PostThread> = {
  title: "PostThread",
  component: PostThread,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  args: {},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const NewThread: Story = {
  args: {},
};

export const Reply: Story = {
  args: {
    replyTo: "abc123def456abc123def456abc123def456abc123def456abc123def456abc1",
  },
};
