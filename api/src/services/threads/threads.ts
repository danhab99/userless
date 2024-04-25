import type { QueryResolvers, MutationResolvers } from 'types/graphql'
import { setPolicy } from 'src/lib/pgchan'

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

export const createThread: MutationResolvers['createThread'] = ({ input }) => {
  return db.thread.create({
    data: input,
  })
}

export const updateThread: MutationResolvers['updatePolicy'] = async (args) => {
  return args.hashs.map((hash) => setPolicy({ hash }, args.policy))
}
