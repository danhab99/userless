import type { Prisma } from "@prisma/client";

export type ThreadForThreadCard = Prisma.ThreadGetPayload<{
  select: {
    policy: true
  },
  include: {
    signedBy: {
      select: {
        name: true;
        email: true;
        finger: true;
      };
    };
  };
}>;
