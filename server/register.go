package main

import (
	"bytes"
	"database/sql"
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

		policy, err := uc.db.CreatePublicKeyPolicy()

		if err != nil {
			panic(err)
		}

		log.Println("Saving private key", key)
		err = uc.db.CreatePublicKey(&PublicKey{
			ID:         generateUUID(),
			ArmoredKey: string(armoredKey),
			Comment:    primaryUser.Comment,
			Email:      primaryUser.Email,
			Finger:     strings.ToLower(fingerprintBase16),
			KeyID:      strings.ToLower(key.PrimaryKey.KeyIdString()),
			Name:       primaryUser.Name,
			PolicyID:   sql.NullString{String: policy.ID, Valid: true},
		})
		log.Println("Saved", err)
		if err != nil {
			uc.db.DeletePublicKeyPolicy(policy.ID)
			panic(err)
		}

		log.Println("Done")

		ctx.Status(201)
	}
}
