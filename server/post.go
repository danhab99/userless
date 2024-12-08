package main

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"strings"
	"userless/server/prisma/db"

	"github.com/BurntSushi/toml"
	"github.com/gin-gonic/gin"
	"github.com/steebchen/prisma-client-go/runtime/types"
	"golang.org/x/crypto/openpgp"
)

func postHandler(uc *UserlessCtx) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		defer ctx.Done()

		text, err := io.ReadAll(ctx.Request.Body)
		if err != nil {
			panic(err)
		}

		fmt.Println("Uploading thread", text)

		// block, _ := clearsign.Decode([]byte(text))

		msg, err := openpgp.ReadMessage(bytes.NewBuffer(text), nil, nil, nil)
		if err != nil {
			panic(err)
		}

		ownerKeyDb, err := uc.getSigner(msg)
		if err != nil {
			log.Fatal(err)
		}
		if ownerKeyDb == nil {
			log.Fatal("cannot find owner key")
		}

		content, _, keyDb := uc.VerifyCleartext(msg)

		timestamp := msg.Signature.CreationTime

		delimiter := strings.Index(content, DELIMITER)
		var info map[string]interface{}
		if delimiter > 0 {
			infoToml := content[:delimiter]
			_, err = toml.NewDecoder(bytes.NewBufferString(infoToml)).Decode(&info)
			if err != nil {
				log.Fatal(err)
			}
		}

		hasher := sha256.New()
		hasher.Write([]byte(content))
		hash := hasher.Sum(nil)

		params := []db.ThreadSetParam{}
		replyTo, hasReplyTo := info["replyTo"].(string)
		if hasReplyTo {
			params = append(params, db.Thread.ReplyTo.Set(replyTo))
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
			db.Thread.Body.Set(content),
			db.Thread.Hash.Set(string(hash)),
			db.Thread.SignedBy.Link(
				db.PublicKey.KeyID.Equals(keyDb.KeyID),
			),
			db.Thread.Timestamp.Set(timestamp),
			params...,
		).Exec(context.Background())

		ctx.Redirect(307, fmt.Sprintf("/thread/%s", thread.Hash))
	}
}
