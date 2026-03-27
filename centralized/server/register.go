package main

import (
	"bytes"
	"context"
	"encoding/hex"
	"io"
	"log"
	"strings"

	"github.com/ProtonMail/go-crypto/openpgp"
	"github.com/gin-gonic/gin"
)

func register(uc *UserlessCtx, config Config) func(ctx *gin.Context) {
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

		policy, err := uc.db.CreatePublicKeyPolicy(context.Background())

		if err != nil {
			panic(err)
		}

		log.Println("Saving private key", key)
		_, err = uc.db.CreatePublicKey(
			context.Background(),
			string(armoredKey),
			primaryUser.Comment,
			primaryUser.Email,
			strings.ToLower(fingerprintBase16),
			strings.ToLower(key.PrimaryKey.KeyIdString()),
			primaryUser.Name,
			policy.ID,
		)
		log.Println("Saved", err)
		if err != nil {
			uc.db.DeletePublicKeyPolicy(context.Background(), policy.ID)
			panic(err)
		}

		log.Println("Done")

		ctx.Status(201)
	}
}
