import type { Preview } from '@storybook/nextjs-vite'
import React from 'react'
import { KeyContextProvider } from 'ui-components'
import '../app/globals.css'

// Make React available globally for ui-components
;(globalThis as any).React = React

const preview: Preview = {
  decorators: [
    (Story, context) => {
      return React.createElement(
        'div',
        { style: { padding: '32px', width: '100%', height: '100vh', boxSizing: 'border-box' } },
        React.createElement(
          KeyContextProvider,
          null,
          React.createElement(Story, context)
        )
      );
    },
  ],
  parameters: {
    layout: 'fullscreen',
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