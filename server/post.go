package main

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"log"
	"strings"

	"github.com/BurntSushi/toml"
	"github.com/ProtonMail/go-crypto/openpgp"
	"github.com/ProtonMail/go-crypto/openpgp/clearsign"
	"github.com/ProtonMail/go-crypto/openpgp/packet"
	"github.com/gin-gonic/gin"
)

func postHandler(uc *UserlessCtx, config Config) func(ctx *gin.Context) {
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

		ownerKeyDb, err := uc.db.FindPublicKeyByFinger(context.Background(), strings.ToLower(finger))
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

		policy := ownerKeyDb.Policy
		if policy == nil {
			ctx.String(404, "signer policy not found")
			return
		}

		var threadPolicy ThreadPolicy

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

		var replyTo *string
		replyToVal, hasReplyTo := info["replyTo"].(string)
		if hasReplyTo {
			replyTo = &replyToVal
		} else if !policy.CanStartThreads {
			ctx.String(401, "not allowed to start threads")
			return
		}

		infoBytes, err := json.Marshal(info)
		if err != nil {
			panic(err)
		}

		thread, err := uc.db.CreateThread(
			context.Background(),
			string(text),
			hashStr,
			ownerKeyDb.ID,
			timestamp,
			replyTo,
			infoBytes,
		)
		if err != nil {
			panic(err)
		}

		_, err = uc.db.CreateThreadPolicy(context.Background(), thread.ID)
		if err != nil {
			panic(err)
		}

		// ctx.Redirect(307, fmt.Sprintf("/thread/%s", hashStr))
		ctx.Status(201)
		ctx.Writer.Write([]byte(thread.Hash))
	}
}
