import type { Thread } from '@prisma/client'

import {
  threads,
  thread,
  createThread,
  updateThread,
  deleteThread,
} from './threads'
import type { StandardScenario } from './threads.scenarios'

// Generated boilerplate tests do not account for all circumstances
// and can fail without adjustments, e.g. Float.
//           Please refer to the RedwoodJS Testing Docs:
//       https://redwoodjs.com/docs/testing#testing-services
// https://redwoodjs.com/docs/testing#jest-expect-type-considerations

describe('threads', () => {
  scenario('returns all threads', async (scenario: StandardScenario) => {
    const result = await threads()

    expect(result.length).toEqual(Object.keys(scenario.thread).length)
  })

  scenario('returns a single thread', async (scenario: StandardScenario) => {
    const result = await thread({ id: scenario.thread.one.id })

    expect(result).toEqual(scenario.thread.one)
  })

  scenario('creates a thread', async (scenario: StandardScenario) => {
    const result = await createThread({
      input: {
        body: 'String',
        hash: 'String3390603',
        signature: 'String',
        signedById: scenario.thread.two.signedById,
        timestamp: '2024-04-25T01:44:47.591Z',
      },
    })

    expect(result.body).toEqual('String')
    expect(result.hash).toEqual('String3390603')
    expect(result.signature).toEqual('String')
    expect(result.signedById).toEqual(scenario.thread.two.signedById)
    expect(result.timestamp).toEqual(new Date('2024-04-25T01:44:47.591Z'))
  })

  scenario('updates a thread', async (scenario: StandardScenario) => {
    const original = (await thread({ id: scenario.thread.one.id })) as Thread
    const result = await updateThread({
      id: original.id,
      input: { body: 'String2' },
    })

    expect(result.body).toEqual('String2')
  })

  scenario('deletes a thread', async (scenario: StandardScenario) => {
    const original = (await deleteThread({
      id: scenario.thread.one.id,
    })) as Thread
    const result = await thread({ id: original.id })

    expect(result).toEqual(null)
  })
})
