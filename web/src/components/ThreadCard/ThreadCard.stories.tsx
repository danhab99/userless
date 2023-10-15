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

import ThreadCard from './ThreadCard'

const meta: Meta<typeof ThreadCard> = {
  component: ThreadCard,
}

export default meta

type Story = StoryObj<typeof ThreadCard>

export const Primary: Story = {
  args: {
    thread: {
      approved: true,
      body: 'test body',
      files: [
        {
          hash: "sadfasdf",
          mimeType: "image/png",
          url: "https://picsum.photos/100",
          thread: {} as any,
        },
        {
          hash: "sadfasdf",
          mimeType: "video/mp4",
          url: "https://picsum.photos/100",
          thread: {} as any,
        }
      ],
      hash: 'sadfoihhasd',
      replies: [],
      signature: '',
      timestamp: new Date(),
      parent: null,
      signedBy: {
        approved: true,
        armoredKey: "",
        comment: "test comment",
        email: "test@email.com",
        finger: "lkfjsaflk",
        keyId: "asdfasd",
        master: false,
        name: "Test key owner",
        revoked: false,
        sponsoring: [],
        threads: []
      },
    },
  },
}
