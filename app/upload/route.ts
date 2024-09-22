import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import * as openpgp from "openpgp";
import { BUCKET, s3Client } from "@/lib/s3";
import { createHash } from "crypto";

const db = new PrismaClient();

export async function POST(req: NextRequest) {
  const data = await req.formData();

  const docFormData = data.get("document");
  if (!(docFormData instanceof File)) {
    return
  }
  const docArrBuffPromise = docFormData.arrayBuffer()
  
  const sigFormData = data.get("signature");
  if (!(sigFormData instanceof File)) {
    return
  }
  const sigArrBuffPromise = sigFormData.text();

  const [docArrayBuff, sigArmored ] = await Promise.all([docArrBuffPromise, sigArrBuffPromise]);
  const docBuff = Buffer.from(docArrayBuff);

  console.log("Receiving upload");

  const pgpDoc = openpgp.createMessage({
    binary: docBuff,
  });

  const pgpSig = await openpgp.readSignature({
    armoredSignature: sigArmored,
  });

  if (!pgpSig.packets[0].created) {
    return new NextResponse("signature doesn't have date", {
      status: 401,
    });
  }

  const publicKey = await db.publicKey.findUnique({
    where: { keyId: pgpSig.getSigningKeyIDs()[0].toHex() },
    select: {
      policy: true,
      armoredKey: true,
    },
  });

  if (!publicKey) {
    return new NextResponse("public key not found", { status: 404 });
  }

  if (publicKey.policy.revoked) {
    return new NextResponse("public key revoked", { status: 401 });
  }

  if (!publicKey.policy.allowedToUploadFiles) {
    return new NextResponse("public key not allowed to upload files", {
      status: 401,
    });
  }

  if (publicKey.policy.maxFileSize < docBuff.byteLength) {
    return new NextResponse("file to big", { status: 403 });
  }

  const verification = await openpgp.verify({
    message: await pgpDoc,
    signature: pgpSig,
    verificationKeys: await openpgp.readKey({
      armoredKey: publicKey.armoredKey,
    }),
  });

  const verified = (
    await Promise.all(verification.signatures.map((x) => x.verified))
  ).every((x) => x);

  if (!verified) {
    return new NextResponse("signature not valid", { status: 401 });
  }

  const hasher = createHash("sha256");
  hasher.write(docBuff);
  const hash = hasher.digest("hex");

  await Promise.all([
    s3Client.putObject(BUCKET, `${hash}_sig`, sigArmored),
    s3Client.putObject(BUCKET, hash, docBuff),
    db.file.create({
      data: {
        hash,
        size: docBuff.length,
        timestamp: pgpSig.packets[0].created,
        signedBy: {
          connect: {
            keyId: pgpSig.getSigningKeyIDs()[0].toHex(),
          },
        },
      },
    }),
  ]);

  return new NextResponse(hash, {
    status: 201,
    statusText: "created",
  });
}
