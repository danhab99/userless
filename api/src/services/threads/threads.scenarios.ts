import type { Prisma, Thread } from '@prisma/client'
import type { ScenarioData } from '@redwoodjs/testing/api'

export const standard = defineScenario<Prisma.ThreadCreateArgs>({
  thread: {
    one: {
      data: {
        body: 'String',
        hash: 'String1893859',
        signature: 'String',
        timestamp: '2023-10-14T04:05:05.761Z',
      },
    },
    two: {
      data: {
        body: 'String',
        hash: 'String3526995',
        signature: 'String',
        timestamp: '2023-10-14T04:05:05.761Z',
      },
    },
  },
})

export type StandardScenario = ScenarioData<Thread, 'thread'>
