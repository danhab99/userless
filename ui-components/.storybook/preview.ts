import type { Preview } from '@storybook/nextjs-vite'
import '../src/styles.css'
import React from 'react'
import { KeyContextProvider } from '../src/KeyContext/KeyContext'

const preview: Preview = {
  decorators: [
    (Story, context) => {
      return React.createElement(
        KeyContextProvider,
        null,
        React.createElement(Story, context)
      );
    },
  ],
  parameters: {
    nextjs: {
      appDirectory: true,
    },
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },
  },
};

export default preview;
