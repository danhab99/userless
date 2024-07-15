import type {
  QueryResolvers,
  MutationResolvers,
  ThreadRelationResolvers,
  Thread as ThreadType,
} from 'types/graphql'
import { setPolicy, findAncestors, uploadThread } from 'src/lib/pgchan'
import * as openpgp from 'openpgp'

import { db } from 'src/lib/db'

export const threads: QueryResolvers['threads'] = (args) => {
  return db.thread.findMany({
    skip: args.skip,
    take: args.limit,
    orderBy: {
      timestamp: "desc",
    },
    where: {
      replyTo: {
        isSet: false,
      },
    },
  })
}

export const thread: QueryResolvers['thread'] = ({ threadHash }) => {
  return db.thread.findUnique({
    where: {
      hash: threadHash,
    },
  })
}

export const createThread: MutationResolvers['createThread'] = async ({
  input,
}) => {
  return uploadThread(input.clearText)
}

export const updatePolicy: MutationResolvers['updatePolicy'] = async (args) => {
  return args.hashs.map((hash) => setPolicy({ hash }, args.policy))
}

export const Thread: ThreadRelationResolvers = {
  parent: (args, { root }) => {
    return db.thread
      .findUnique({
        where: {
          hash: root.hash,
        },
      })
      .parent()
  },
  parents: async (args, { root }) => {
    var parents = await findAncestors(root as ThreadType)
    if (args?.limit > 0) {
      parents = parents.slice(0, args.limit)
    }
    return parents
  },
  policy: async (args, { root }) => {
    if (!root.policy) {
      return ''
    }
    const msg = await openpgp.readCleartextMessage({
      cleartextMessage: root.policy,
    })
    return JSON.parse(msg.getText())
  },
  signedBy: async (args, { root }) => {
    return db.thread
      .findUnique({
        where: {
          hash: root.hash,
        },
      })
      .signedBy()
  },
  replies: async (args, { root }) => {
    return db.thread.findMany({
      where: {
        replyTo: root.hash,
      },
      skip: args.skip,
      take: args.limit,
      orderBy: {
        timestamp: "desc",
      }
    })
  },
}
