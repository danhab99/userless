import type { Prisma, File } from '@prisma/client'
import type { ScenarioData } from '@redwoodjs/testing/api'

export const standard = defineScenario<Prisma.FileCreateArgs>({
  file: {
    one: {
      data: {
        hash: 'String5461446',
        id: 8416995,
        mimeType: 'String',
        url: 'String',
        thread: {
          create: {
            body: 'String',
            hash: 'String4940352',
            replyTo: 'String',
            signature: 'String',
            timestamp: '2023-10-14T04:03:55.457Z',
          },
        },
      },
    },
    two: {
      data: {
        hash: 'String1453276',
        id: 2187381,
        mimeType: 'String',
        url: 'String',
        thread: {
          create: {
            body: 'String',
            hash: 'String1255506',
            replyTo: 'String',
            signature: 'String',
            timestamp: '2023-10-14T04:03:55.457Z',
          },
        },
      },
    },
  },
})

export type StandardScenario = ScenarioData<File, 'file'>
