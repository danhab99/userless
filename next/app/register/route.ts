import { Prisma, PrismaClient } from "@prisma/client";
import {redirect} from "next/navigation";
import * as openpgp from "openpgp";

const db = new PrismaClient();

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(request: Request) {
  const body = await request.text()

  console.log("Read armored keys", body);

  const pks = await openpgp.readKeys({
    armoredKeys: body,
  });

  await db.publicKey.createMany({
    data: await Promise.all(
      pks.map(async (pk) => {
        const { user } = await pk.getPrimaryUser();

        return {
          armoredKey: pk.armor(),
          comment: user.userID?.comment,
          email: user.userID?.email,
          finger: pk.getFingerprint(),
          keyId: pk.getKeyID().toHex(),
          name: user.userID?.name,
          policy: {},
        } as Prisma.PublicKeyCreateManyInput;
      }),
    ),
  });

  console.log(
    "Registered keys",
    pks.map((x) => x.getKeyID().toHex()),
  );

  redirect(`/k/${pks[0].getKeyID().toHex()}`)
}
