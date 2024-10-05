import * as openpgp from "openpgp";
import { PrismaClient, PublicKey } from "@prisma/client";
import {digestHash} from "./hash";
import * as toml from "smol-toml";

const db = new PrismaClient();

class PGChanError extends Error {
  constructor(msg: string) {
    super(msg);
    Object.setPrototypeOf(this, PGChanError.prototype);
  }
}

function spoofArmoredSignature(clearText: string) {
  const clearLine = clearText.split("\n");
  var armoredSignature = "";
  var seenStart = false;
  var seenEnd = false;

  clearLine.forEach((line) => {
    seenStart = seenStart || line === "-----BEGIN PGP SIGNATURE-----";
    seenEnd = seenEnd || line === "-----END PGP SIGNATURE-----";

    if (seenStart && !seenEnd) {
      armoredSignature += line + "\n";
    }
  });

  armoredSignature += "-----END PGP SIGNATURE-----";

  return armoredSignature;
}

async function getSigner(msg: openpgp.CleartextMessage): Promise<PublicKey> {
  const keyIds = msg.getSigningKeyIDs();
  if (keyIds.length <= 0) {
    throw new PGChanError("missing signatures");
  }

  const ownerKeyId = keyIds[0];

  const x = await db.publicKey.findFirst({
    where: {
      keyId: ownerKeyId.toHex(),
      policy: {
        is: {
          revoked: false,
        }
      }
    },
  });

  if (!x) {
    throw new PGChanError("Nobody signed this");
  }

  return x as unknown as PublicKey;
}

export type Policy = {
  allowReplies: boolean;
  banned: boolean;
  requireRecipients: string[];
};

export async function uploadThread(threadClearText: string) {
  console.log("Uploading thread", threadClearText);
  const msg = await openpgp.readCleartextMessage({
    cleartextMessage: threadClearText,
  });

  const ownerKeyDb = await getSigner(msg);

  if (!ownerKeyDb) {
    throw new PGChanError("cannot find owner key");
  }

  const ownerKey = await openpgp.readKey({
    armoredKey: ownerKeyDb.armoredKey,
  });

  const verifications = await msg.verify([ownerKey]);

  if (!(await verifications[0].verified)) {
    throw new PGChanError("unable to verify signature");
  }

  var armoredSignature: string = spoofArmoredSignature(threadClearText);

  const signature = await openpgp.readSignature({ armoredSignature });
  var timestamp: Date | null = signature.packets[0].created;
  if (!timestamp) {
    throw "no timestamp";
  }

  var postContent = msg.getText();

  const [infoStr] = postContent.split(/\n---\n/, 2);
  const info = toml.parse(infoStr)
  const hash = digestHash(threadClearText)

  return db.thread.create({
    data: {
      body: threadClearText,
      hash: hash,
      timestamp: timestamp,
      replyTo: info["replyTo"] as string | undefined,
      signedById: signature.getSigningKeyIDs()[0].toHex(),
      info,
      policy: {
        acceptsReplies: true,
        visible: true,
        encryptFor: [],
        policyEditors: [],
      },
    },
  });
}

export async function registerPublicKey(publicKeyArmored: string) {
  const newKey = await openpgp.readKey({
    armoredKey: publicKeyArmored,
  });
  const { user } = await newKey.getPrimaryUser();
  if (!user.userID) {
    throw "no user";
  }

  return db.publicKey.create({
    data: {
      armoredKey: publicKeyArmored,
      comment: user.userID.comment,
      email: user.userID.email,
      finger: newKey.getFingerprint(),
      keyId: newKey.getKeyID().toHex(),
      name: user.userID.name,
      policy: {
        allowedToPost: true,
        canStartThreads: true,
        isMaster: true,
      },
    },
  });
}


