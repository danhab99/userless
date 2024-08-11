import type { Prisma } from "@prisma/client";

export type ThreadForThreadCard = Prisma.ThreadGetPayload<{
  include: {
    signedBy: {
      select: {
        name: true;
        email: true;
        keyId: true;
      };
    };
  };
}>;
