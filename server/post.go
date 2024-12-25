package main

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"strings"
	"userless/server/prisma/db"

	"github.com/BurntSushi/toml"
	"github.com/ProtonMail/go-crypto/openpgp"
	"github.com/ProtonMail/go-crypto/openpgp/clearsign"
	"github.com/ProtonMail/go-crypto/openpgp/packet"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/steebchen/prisma-client-go/runtime/types"
)

func postHandler(uc *UserlessCtx, config Config) func(ctx *gin.Context) {
	client := uc.client

	return func(ctx *gin.Context) {
		defer ctx.Done()

		text, err := io.ReadAll(ctx.Request.Body)
		if err != nil {
			panic(err)
		}

		msg, _ := clearsign.Decode(text)

		sigPacket, err := packet.NewReader(msg.ArmoredSignature.Body).Next()
		if err != nil {
			panic(err)
		}

		sig := sigPacket.(*packet.Signature)
		timestamp := sig.CreationTime
		finger := hex.EncodeToString(sig.IssuerFingerprint)

		ownerKeyDb, err := client.PublicKey.FindUnique(
			db.PublicKey.Finger.Equals(strings.ToLower(finger)),
		).With(
			db.PublicKey.Policy.Fetch(),
		).Exec(context.Background())
		if err != nil {
			panic(err)
		}
		if ownerKeyDb == nil {
			log.Fatal("cannot find owner key")
		}

		key, err := openpgp.ReadArmoredKeyRing(strings.NewReader(ownerKeyDb.ArmoredKey))
		if err != nil {
			panic(err)
		}

		msg, _ = clearsign.Decode(text)
		_, err = msg.VerifySignature(key, nil)
		if err != nil {
			panic(err)
		}

		policy, ok := ownerKeyDb.Policy()
		if !ok {
			ctx.String(404, "signer policy not found")
			return
		}

		var threadPolicy db.RawThreadPolicyModel

		err = InspectPolicy(
			text,
			config.ThreadsConfig.ExecOnNewThread,
			config.ThreadsConfig.WebHookUrl,
			config.ThreadsConfig.Mode,
			&threadPolicy,
			func() error {
				if policy.Revoked {
					ctx.String(400, "this was signed by a revoked key")
					return nil
				}

				if !policy.AllowedToPost {
					ctx.String(401, "not allowed to post")
					return nil
				}
				return nil
			},
		)
		if err != nil {
			ctx.String(400, "rejected thread %+v", err)
			return
		}

		content := string(msg.Plaintext)

		delimiter := strings.Index(content, DELIMITER)
		var info map[string]interface{}
		if delimiter > 0 {
			infoToml := content[:delimiter]
			_, err = toml.NewDecoder(bytes.NewBufferString(infoToml)).Decode(&info)
			if err != nil {
				log.Fatal(err)
			}
		}

		hash := sha256.Sum256([]byte(content))
		hashStr := hex.EncodeToString(hash[:])

		log.Println("Saving thread", hashStr)

		id := uuid.New()

		params := []db.ThreadSetParam{
			db.Thread.ID.Set(id.String()),
		}
		replyTo, hasReplyTo := info["replyTo"].(string)
		if hasReplyTo {
			params = append(params, db.Thread.ReplyTo.Set(replyTo))
		} else if !policy.CanStartThreads {
			ctx.String(401, "not allowed to start threads")
			return
		}

		infoBytes := bytes.NewBuffer([]byte{})
		err = json.NewEncoder(infoBytes).Encode(info)
		if err != nil {
			panic(err)
		}

		x := json.RawMessage(infoBytes.Bytes())
		xx := types.JSON(x)

		params = append(params, db.Thread.Info.Set(xx))

		thread, err := uc.client.Thread.CreateOne(
			db.Thread.Body.Set(string(text)),
			db.Thread.Hash.Set(hashStr),
			db.Thread.SignedBy.Link(
				db.PublicKey.KeyID.Equals(strings.ToLower(ownerKeyDb.KeyID)),
			),
			db.Thread.Timestamp.Set(timestamp),
			params...,
		).Exec(context.Background())
		if err != nil {
			panic(err)
		}

		_, err = uc.client.ThreadPolicy.CreateOne(
			db.ThreadPolicy.Thread.Link(
				db.Thread.ID.Equals(thread.ID),
			),
		).Exec(context.Background())
		if err != nil {
			panic(err)
		}

		ctx.Redirect(307, fmt.Sprintf("/thread/%s", hashStr))
	}
}
