// Pass props to your component by passing an `args` object to your story
//
// ```tsx
// export const Primary: Story = {
//  args: {
//    propName: propValue
//  }
// }
// ```
//
// See https://storybook.js.org/docs/react/writing-stories/args.

import type { Meta, StoryObj } from '@storybook/react'

import FileDisplay from './FileDisplay'

const meta: Meta<typeof FileDisplay> = {
  component: FileDisplay,
}

export default meta

type Story = StoryObj<typeof FileDisplay>

export const Primary: Story = {
  args: {
    files: [
      {
        hash: 'sadfkjlasdfkj',
        mimeType: 'image/png',
        url: 'https://picsum.photos/300',
        thread: {} as any,
      },
    ],
  },
}
