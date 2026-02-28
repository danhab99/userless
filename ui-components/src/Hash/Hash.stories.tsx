import type { Meta, StoryObj } from "@storybook/react";
import { Hash } from "./Hash";

const meta: Meta<typeof Hash> = {
  title: "Hash",
  component: Hash,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  args: {},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    content: "abc123def456abc123def456abc123def456abc123def456abc123def456abc1",
  },
};
