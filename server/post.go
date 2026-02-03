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

		if len(text) == 0 {
			ctx.String(400, "empty request body")
			return
		}

		msg, _ := clearsign.Decode(text)
		if msg == nil {
			ctx.String(400, "invalid clearsigned message")
			return
		}

		sigPacket, err := packet.NewReader(msg.ArmoredSignature.Body).Next()
		if err != nil {
			ctx.String(400, "failed to read signature packet: %v", err)
			return
		}

		sig := sigPacket.(*packet.Signature)
		timestamp := sig.CreationTime
		finger := hex.EncodeToString(sig.IssuerFingerprint)

		ownerKeyDb, err := uc.db.FindPublicKeyByFinger(context.Background(), strings.ToLower(finger))
		if err != nil {
			panic(err)
		}
		if ownerKeyDb == nil {
			ctx.String(404, "signer key not found in database")
			return
		}

		key, err := openpgp.ReadArmoredKeyRing(strings.NewReader(ownerKeyDb.ArmoredKey))
		if err != nil {
			panic(err)
		}

		msg, _ = clearsign.Decode(text)
		if msg == nil {
			ctx.String(400, "failed to verify clearsigned message")
			return
		}
		_, err = msg.VerifySignature(key, nil)
		if err != nil {
			ctx.String(401, "signature verification failed: %v", err)
			return
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
		info := make(map[string]interface{})
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
			// Verify the parent thread exists
			parentThread, err := uc.db.FindThreadByHash(context.Background(), replyToVal)
			if err != nil {
				panic(err)
			}
			if parentThread == nil {
				ctx.String(404, "parent thread not found: %s", replyToVal)
				return
			}
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
			// Check if it's a duplicate key error
			if strings.Contains(err.Error(), "duplicate key") || strings.Contains(err.Error(), "Thread_hash_key") {
				ctx.String(409, "Thread with this content already exists: %s", hashStr)
				return
			}
			// Check if it's a foreign key error (shouldn't happen now, but just in case)
			if strings.Contains(err.Error(), "fk_parent") || strings.Contains(err.Error(), "foreign key") {
				ctx.String(400, "invalid parent thread reference")
				return
			}
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
