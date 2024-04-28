import type {
  QueryResolvers,
  MutationResolvers,
  ThreadRelationResolvers,
  Thread as ThreadType,
} from 'types/graphql'
import {
  setPolicy,
  findAncestors,
  uploadThread,
} from 'src/lib/pgchan'
import * as openpgp from "openpgp";

import { db } from 'src/lib/db'

export const threads: QueryResolvers['threads'] = (args) => {
  return db.thread.findMany({
    skip: args.skip,
    take: args.limit,
  })
}

export const thread: QueryResolvers['thread'] = ({ id }) => {
  return db.thread.findUnique({
    where: { id },
  })
}

export const createThread: MutationResolvers['createThread'] = async ({
  input,
}) => {
  return uploadThread(input.clearText)
}

export const updateThread: MutationResolvers['updatePolicy'] = async (args) => {
  return args.hashs.map((hash) => setPolicy({ hash }, args.policy))
}

export const Thread: ThreadRelationResolvers = {
  parents: (args, { root }) => {
    return findAncestors(root as ThreadType, args.limit)
  },
  policy: async (args, {root}) => {
    if (!root.policy) {
      return ""
    }
    const msg = await openpgp.readCleartextMessage({cleartextMessage: root.policy})
    return JSON.parse(msg.getText())
  },
  signedBy: async (args, {root}) => {
    return db.thread.findUnique({
      where: {
        hash: root.hash
      }
    }).signedBy()
  }
}
