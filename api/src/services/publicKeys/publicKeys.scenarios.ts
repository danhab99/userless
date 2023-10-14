import type { Prisma, PublicKey } from '@prisma/client'
import type { ScenarioData } from '@redwoodjs/testing/api'

export const standard = defineScenario<Prisma.PublicKeyCreateArgs>({
  publicKey: {
    one: {
      data: {
        armoredKey: 'String',
        comment: 'String',
        email: 'String',
        finger: 'String',
        id: 1602330,
        keyId: 'String3434060',
        master: true,
        name: 'String',
      },
    },
    two: {
      data: {
        armoredKey: 'String',
        comment: 'String',
        email: 'String',
        finger: 'String',
        id: 327341,
        keyId: 'String5363038',
        master: true,
        name: 'String',
      },
    },
  },
})

export type StandardScenario = ScenarioData<PublicKey, 'publicKey'>
