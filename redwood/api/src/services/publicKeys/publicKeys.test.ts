import type { PublicKey } from '@prisma/client'

import {
  publicKeys,
  publicKey,
  createPublicKey,
  updatePublicKey,
  deletePublicKey,
} from './publicKeys'
import type { StandardScenario } from './publicKeys.scenarios'

// Generated boilerplate tests do not account for all circumstances
// and can fail without adjustments, e.g. Float.
//           Please refer to the RedwoodJS Testing Docs:
//       https://redwoodjs.com/docs/testing#testing-services
// https://redwoodjs.com/docs/testing#jest-expect-type-considerations

describe('publicKeys', () => {
  scenario('returns all publicKeys', async (scenario: StandardScenario) => {
    const result = await publicKeys()

    expect(result.length).toEqual(Object.keys(scenario.publicKey).length)
  })

  scenario('returns a single publicKey', async (scenario: StandardScenario) => {
    const result = await publicKey({ id: scenario.publicKey.one.id })

    expect(result).toEqual(scenario.publicKey.one)
  })

  scenario('creates a publicKey', async () => {
    const result = await createPublicKey({
      input: {
        armoredKey: 'String',
        comment: 'String',
        email: 'String',
        finger: 'String',
        id: 8508506,
        keyId: 'String8504841',
        master: true,
        name: 'String',
      },
    })

    expect(result.armoredKey).toEqual('String')
    expect(result.comment).toEqual('String')
    expect(result.email).toEqual('String')
    expect(result.finger).toEqual('String')
    expect(result.id).toEqual(8508506)
    expect(result.keyId).toEqual('String8504841')
    expect(result.master).toEqual(true)
    expect(result.name).toEqual('String')
  })

  scenario('updates a publicKey', async (scenario: StandardScenario) => {
    const original = (await publicKey({
      id: scenario.publicKey.one.id,
    })) as PublicKey
    const result = await updatePublicKey({
      id: original.id,
      input: { armoredKey: 'String2' },
    })

    expect(result.armoredKey).toEqual('String2')
  })

  scenario('deletes a publicKey', async (scenario: StandardScenario) => {
    const original = (await deletePublicKey({
      id: scenario.publicKey.one.id,
    })) as PublicKey
    const result = await publicKey({ id: original.id })

    expect(result).toEqual(null)
  })
})
