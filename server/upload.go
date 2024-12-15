package main

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"io"
	"strconv"
	"strings"
	"sync"
	"userless/server/prisma/db"

	openpgp "github.com/ProtonMail/go-crypto/openpgp"
	"github.com/ProtonMail/go-crypto/openpgp/armor"
	"github.com/ProtonMail/go-crypto/openpgp/packet"
	"github.com/gin-gonic/gin"
	"github.com/minio/minio-go"
)

func uploadHandler(uc *UserlessCtx) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		file, header, err := ctx.Request.FormFile("document")
		if err != nil {
			ctx.String(400, "document must be a file")
			return
		}
		defer file.Close()

		docBuff, err := io.ReadAll(file)
		if err != nil {
			ctx.String(500, "error reading file")
			return
		}

		sigArmored := ctx.Request.FormValue("signature")
		if sigArmored == "" {
			ctx.String(400, "sig must be armored text")
			return
		}

		block, err := armor.Decode(bytes.NewReader([]byte(sigArmored)))
		if err != nil {
			ctx.String(400, "invalid armored signature")
			return
		}

		detatchedPacket := packet.NewReader(block.Body)
		pkt, err := detatchedPacket.Next()
		if err != nil {
			panic(err)
		}
		sigPacket := pkt.(*packet.Signature)

		if sigPacket.CreationTime.IsZero() {
			ctx.String(400, "signature doesn't have date")
			return
		}

		keyID := strings.ToUpper(strconv.FormatUint(*sigPacket.IssuerKeyId, 16))
		publicKey, err := uc.client.PublicKey.FindUnique(
			db.PublicKey.KeyID.Equals(keyID),
		).With(
			db.PublicKey.Policy.Fetch(),
		).Exec(context.Background())
		if err != nil {
			ctx.String(404, "public key not found")
			return
		}

		policy, ok := publicKey.Policy()
		if !ok {
			panic("this key needs a policy")
		}

		if policy.Revoked {
			ctx.String(401, "public key revoked")
			return
		}

		if !policy.AllowedToUploadFiles {
			ctx.String(401, "public key not allowed to upload files")
			return
		}

		if policy.MaxFileSize < db.BigInt(len(docBuff)) {
			ctx.String(403, "file too big")
			return
		}

		pgpKey, err := openpgp.ReadArmoredKeyRing(bytes.NewReader([]byte(publicKey.ArmoredKey)))
		if err != nil {
			ctx.String(500, "error reading public key")
			return
		}

		hash := sha256.Sum256(docBuff)
		_, err = openpgp.CheckArmoredDetachedSignature(pgpKey, bytes.NewBuffer(docBuff), strings.NewReader(sigArmored), nil)
		if err != nil {
			ctx.String(400, "signature not valid")
			return
		}

		var wg sync.WaitGroup
		wg.Add(2)

		go func() {
			defer wg.Done()
			_, err = uc.minioClient.PutObject(uc.bucketName, string(hash[:]), bytes.NewBuffer(docBuff), int64(len(docBuff)), minio.PutObjectOptions{})
		}()

		go func() {
			defer wg.Done()
			_, err = uc.minioClient.PutObject(uc.bucketName, string(hash[:])+"_sig", strings.NewReader(sigArmored), int64(len(sigArmored)), minio.PutObjectOptions{})
		}()

		wg.Wait()

		_, err = uc.client.File.UpsertOne(
			db.File.Hash.Equals(string(hash[:])),
		).Create(
			db.File.SignedBy.Link(
				db.PublicKey.KeyID.Equals(keyID),
			),
			db.File.Hash.Set(string(hash[:])),
			db.File.Timestamp.Set(sigPacket.CreationTime),
			db.File.Size.Set(db.BigInt(len(docBuff))),
			db.File.MimeType.Set(header.Header.Get("Content-Type")),
		).Update().Exec(context.Background())

		if err != nil {
			ctx.String(500, "error creating database record")
			return
		}

		hashStr := hex.EncodeToString(hash[:])

		ctx.String(201, hashStr)
	}
}
