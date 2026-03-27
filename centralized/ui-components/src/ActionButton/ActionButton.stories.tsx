import type { Meta, StoryObj } from "@storybook/react";
import { ActionButton } from "./ActionButton";

const meta: Meta<typeof ActionButton> = {
  title: "ActionButton",
  component: ActionButton,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  args: {
    label: "Click me",
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: "Action",
  },
};

export const Danger: Story = {
  args: {
    label: "Delete",
    color: "text-red-500",
  },
};

export const Info: Story = {
  args: {
    label: "Register",
    color: "text-purple-500",
  },
};
