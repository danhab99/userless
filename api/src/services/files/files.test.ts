import type { File } from '@prisma/client'

import { files, file, createFile, updateFile, deleteFile } from './files'
import type { StandardScenario } from './files.scenarios'

// Generated boilerplate tests do not account for all circumstances
// and can fail without adjustments, e.g. Float.
//           Please refer to the RedwoodJS Testing Docs:
//       https://redwoodjs.com/docs/testing#testing-services
// https://redwoodjs.com/docs/testing#jest-expect-type-considerations

describe('files', () => {
  scenario('returns all files', async (scenario: StandardScenario) => {
    const result = await files()

    expect(result.length).toEqual(Object.keys(scenario.file).length)
  })

  scenario('returns a single file', async (scenario: StandardScenario) => {
    const result = await file({ id: scenario.file.one.id })

    expect(result).toEqual(scenario.file.one)
  })

  scenario('creates a file', async (scenario: StandardScenario) => {
    const result = await createFile({
      input: {
        hash: 'String4781773',
        id: 5010218,
        mimeType: 'String',
        threadId: scenario.file.two.threadId,
        url: 'String',
      },
    })

    expect(result.hash).toEqual('String4781773')
    expect(result.id).toEqual(5010218)
    expect(result.mimeType).toEqual('String')
    expect(result.threadId).toEqual(scenario.file.two.threadId)
    expect(result.url).toEqual('String')
  })

  scenario('updates a file', async (scenario: StandardScenario) => {
    const original = (await file({ id: scenario.file.one.id })) as File
    const result = await updateFile({
      id: original.id,
      input: { hash: 'String39912732' },
    })

    expect(result.hash).toEqual('String39912732')
  })

  scenario('deletes a file', async (scenario: StandardScenario) => {
    const original = (await deleteFile({ id: scenario.file.one.id })) as File
    const result = await file({ id: original.id })

    expect(result).toEqual(null)
  })
})
