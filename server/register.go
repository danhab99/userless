package main

import (
	"bytes"
	"context"
	"encoding/hex"
	"io"
	"log"
	"strings"
	"userless/server/prisma/db"

	"github.com/ProtonMail/go-crypto/openpgp"
	"github.com/gin-gonic/gin"
)

func register(uc *UserlessCtx) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		defer ctx.Done()

		armoredKey, err := io.ReadAll(ctx.Request.Body)
		if err != nil {
			panic(err)
		}

		keys, err := openpgp.ReadArmoredKeyRing(bytes.NewBuffer(armoredKey))
		if err != nil {
			panic(err)
		}
		if len(keys) > 1 {
			panic("too many keys")
		}

		key := keys[0]

		log.Println("Registering keys", keys)

		primaryUser := key.PrimaryIdentity().UserId
		if primaryUser == nil {
			panic("missing identity")
		}

		fingerprintBytes := key.PrimaryKey.Fingerprint[:]
		fingerprintBase16 := hex.EncodeToString(fingerprintBytes)

		policy, err := uc.client.PublicKeyPolicy.CreateOne().Exec(context.Background())

		if err != nil {
			panic(err)
		}

		log.Println("Saving private key", key)
		_, err = uc.client.PublicKey.CreateOne(
			db.PublicKey.ArmoredKey.Set(string(armoredKey)),
			db.PublicKey.Comment.Set(primaryUser.Comment),
			db.PublicKey.Email.Set(primaryUser.Email),
			db.PublicKey.Finger.Set(strings.ToLower(fingerprintBase16)),
			db.PublicKey.KeyID.Set(strings.ToLower(key.PrimaryKey.KeyIdString())),
			db.PublicKey.Name.Set(primaryUser.Name),
			db.PublicKey.Policy.Link(db.PublicKeyPolicy.ID.Equals(policy.ID)),
		).Exec(context.Background())
		log.Println("Saved", err)
		if err != nil {
			uc.client.PublicKeyPolicy.FindUnique(
				db.PublicKeyPolicy.ID.Equals(policy.ID),
			).Delete().Exec(context.Background())
			panic(err)
		}

		log.Println("Done")

		ctx.Status(201)
	}
}
