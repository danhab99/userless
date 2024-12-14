package main

import (
	"context"
	"userless/server/prisma/db"

	"github.com/ProtonMail/go-crypto/openpgp"
	"github.com/gin-gonic/gin"
	"github.com/pelletier/go-toml/v2"
)

func getKey(uc *UserlessCtx) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		defer ctx.Done()
		keyRaw, ok := ctx.Get("key")
		if !ok {
			panic("key not set")
		}

		key := keyRaw.(*db.PublicKeyModel)
		ctx.Writer.WriteString(key.ArmoredKey)
		ctx.Status(200)
	}
}

func getKeyThreads(uc *UserlessCtx) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		defer ctx.Done()
		keyid := ctx.Param("id")
		threads, err := uc.client.Thread.FindMany(
			db.Thread.SignedBy.Where(
				db.PublicKey.KeyID.Equals(keyid),
			),
		).Select(
			db.Thread.Hash.Field(),
		).Exec(context.Background())
		if err != nil {
			panic(err)
		}

		ctx.Status(200)

		for _, thread := range threads {
			_, err := ctx.Writer.WriteString(thread.Hash + "\n")
			if err != nil {
				panic(err)
			}
		}
	}
}

func getKeyFiles(uc *UserlessCtx) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		defer ctx.Done()
		keyid := ctx.Param("id")
		files, err := uc.client.File.FindMany(
			db.File.SignedBy.Where(
				db.PublicKey.KeyID.Equals(keyid),
			),
		).Select(
			db.File.Hash.Field(),
		).Exec(context.Background())
		if err != nil {
			panic(err)
		}

		ctx.Status(200)

		for _, thread := range files {
			_, err := ctx.Writer.WriteString(thread.Hash + "\n")
			if err != nil {
				panic(err)
			}
		}
	}
}

func getKeyPolicy(uc *UserlessCtx) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		p, ok := ctx.Get("key")
		if !ok {
			panic("no key")
		}

		pk := p.(*db.PublicKeyModel)
		policy, ok := pk.Policy()
		if !ok {
			ctx.Status(404)
			return
		}

		ctx.TOML(200, policy)
	}
}

func patchKeyPolicy(uc *UserlessCtx) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		msg, err := openpgp.ReadMessage(ctx.Request.Body, nil, nil, nil)
		if err != nil {
			panic(err)
		}

		body, _, _ := uc.VerifyCleartext(msg)

		var info map[string]interface{}
		err = toml.Unmarshal([]byte(body), &info)
		if err != nil {
			panic(err)
		}

		var changes []db.PublicKeyPolicySetParam

		revoked, ok := info["revoked"].(bool)
		if ok {
			changes = append(changes, db.PublicKeyPolicy.Revoked.Set(revoked))
		}
		allowedToPost, ok := info["allowedToPost"].(bool)
		if ok {
			changes = append(changes, db.PublicKeyPolicy.AllowedToPost.Set(allowedToPost))
		}
		canStartThreads, ok := info["canStartThreads"].(bool)
		if ok {
			changes = append(changes, db.PublicKeyPolicy.CanStartThreads.Set(canStartThreads))
		}
		isMaster, ok := info["isMaster"].(bool)
		if ok {
			changes = append(changes, db.PublicKeyPolicy.IsMaster.Set(isMaster))
		}
		allowedToUploadFiles, ok := info["allowedToUploadFiles"].(bool)
		if ok {
			changes = append(changes, db.PublicKeyPolicy.AllowedToUploadFiles.Set(allowedToUploadFiles))
		}

		id := ctx.Param("id")

		client := uc.client

		_, err = client.PublicKeyPolicy.FindUnique(
			db.PublicKeyPolicy.ID.Equals(id),
		).Update(changes...).Exec(context.Background())
		if err != nil {
			panic(err)
		}

		ctx.Status(203)
	}
}
