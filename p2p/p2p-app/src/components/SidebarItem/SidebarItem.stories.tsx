import type { Meta, StoryObj } from "@storybook/react";
import { SidebarItem } from "./SidebarItem";

// More on how to set up stories at:
// https://storybook.js.org/docs/writing-stories#default-export
const meta: Meta<typeof SidebarItem> = {
  title: "SidebarItem",
  component: SidebarItem,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  args: {},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Test: Story = {
  args: {
    ownerName: "Alice Smith",
    ownerEmail: "alice@example.com",
    timestamp: new Date("2026-04-07T12:00:00"),
    body: `
# Test message
This is a sample message body for the sidebar item.
    `,
  },
};
