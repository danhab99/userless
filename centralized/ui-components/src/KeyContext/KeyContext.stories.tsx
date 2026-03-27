import type { Meta, StoryObj } from "@storybook/react";
import { KeyContextProvider } from "./KeyContext";

const meta: Meta<typeof KeyContextProvider> = {
  title: "KeyContext/KeyContextProvider",
  component: KeyContextProvider,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  args: {},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  decorators: (Story) => {
    return (
      <KeyContextProvider>
        <Story />
      </KeyContextProvider>
    );
  },
  args: {
    children: <p>App content goes here</p>,
  },
};
