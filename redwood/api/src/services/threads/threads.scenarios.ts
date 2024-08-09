import type { Prisma, Thread } from '@prisma/client'
import type { ScenarioData } from '@redwoodjs/testing/api'

export const standard = defineScenario<Prisma.ThreadCreateArgs>({
  thread: {
    one: {
      data: {
        body: 'String',
        hash: 'String5463583',
        signature: 'String',
        timestamp: '2024-04-25T01:44:47.628Z',
        signedBy: {
          create: {
            armoredKey: 'String7291175',
            comment: 'String',
            email: 'String',
            finger: 'String8508857',
            keyId: 'String4190740',
            name: 'String',
          },
        },
      },
    },
    two: {
      data: {
        body: 'String',
        hash: 'String4401497',
        signature: 'String',
        timestamp: '2024-04-25T01:44:47.628Z',
        signedBy: {
          create: {
            armoredKey: 'String3179127',
            comment: 'String',
            email: 'String',
            finger: 'String4808473',
            keyId: 'String6835478',
            name: 'String',
          },
        },
      },
    },
  },
})

export type StandardScenario = ScenarioData<Thread, 'thread'>
