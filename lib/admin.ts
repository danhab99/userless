import { PrismaClient } from "@prisma/client";
import * as openpgp from "openpgp";

const db = new PrismaClient();

export async function getMasters() {
  return await db.publicKey.findMany({
    where: {
      policy: {
        is: {
          isMaster: true,
        },
      },
    },
  });

}

export async function encryptForMasters(data: string) {
  const admins = await getMasters();
  console.log("Encrypting for master", admins.map(x => x.finger), data.length);

  const packet = await openpgp.encrypt({
    message: await openpgp.createMessage({
      text: data,
    }),
    encryptionKeys: await Promise.all(
      admins.map((x) => openpgp.readKey({ armoredKey: x.armoredKey })),
    ),
    format: "armored",
  });

  return packet as string;
}
