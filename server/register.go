package main

import (
	"bytes"
	"context"
	"encoding/hex"
	"log"
	"sync"
	"userless/server/prisma/db"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/openpgp"
	"golang.org/x/crypto/openpgp/armor"
	"golang.org/x/crypto/openpgp/packet"
)

func register(uc *UserlessCtx) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		defer ctx.Done()

		keys, err := openpgp.ReadArmoredKeyRing(ctx.Request.Body)
		if err != nil {
			panic(err)
		}

		var wg sync.WaitGroup

		log.Println("Registering keys", keys)

		errChan := make(chan any, 1)

		for _, key := range keys {
			if key.PrivateKey == nil {
				log.Printf("Not a private key %+v \n", key)
				continue
			}

			wg.Add(1)
			go func() {
				defer func() {
					r := recover()
					if r != nil {
						errChan <- r
					}
					wg.Done()
				}()

				var armored bytes.Buffer
				armorWriter, err := armor.Encode(&armored, openpgp.PrivateKeyType, nil)
				if err != nil {
					panic(err)
				}

				err = key.Serialize(armorWriter)
				if err != nil {
					panic(err)
				}

				var primaryUser *packet.UserId
				for _, identity := range key.Identities {
					if primaryUser == nil {
						primaryUser = identity.UserId
						break
					}
				}

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
					db.PublicKey.ArmoredKey.Set(string(armored.Bytes())),
					db.PublicKey.Comment.Set(primaryUser.Comment),
					db.PublicKey.Email.Set(primaryUser.Email),
					db.PublicKey.Finger.Set(fingerprintBase16),
					db.PublicKey.KeyID.Set(key.PrimaryKey.KeyIdString()),
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
			}()
		}

		wg.Wait()
		log.Println("Done")

		close(errChan)
		e, ok := <-errChan
		if ok {
			ctx.Status(201)
		} else if e != nil {
			ctx.Status(400)
			ctx.Writer.WriteString("could not process keys")
		} else {
			ctx.Status(201)
		}
	}
}
