package main

import (
	"context"
	"fmt"

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

		key := keyRaw.(*PublicKey)
		ctx.Writer.WriteString(key.ArmoredKey)
		ctx.Status(200)
	}
}

func getKeyThreads(uc *UserlessCtx) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		defer ctx.Done()
		keyRaw, ok := ctx.Get("key")
		if !ok {
			panic("key not set")
		}
		key := keyRaw.(*PublicKey)

		skip, take := getLimits(ctx)

		threads, err := uc.db.FindThreadsByKeyID(context.Background(), key.ID, skip, take)
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
		keyRaw, ok := ctx.Get("key")
		if !ok {
			panic("key not set")
		}
		key := keyRaw.(*PublicKey)

		skip, take := getLimits(ctx)

		files, err := uc.db.FindFilesByKeyID(context.Background(), key.ID, skip, take)
		if err != nil {
			panic(err)
		}

		ctx.Status(200)

		for _, file := range files {
			_, err := ctx.Writer.WriteString(file.Hash + "\n")
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

		pk := p.(*PublicKey)
		policy := pk.Policy
		if policy == nil {
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

		var revoked, allowedToPost, canStartThreads, isMaster, allowedToUploadFiles *bool

		if v, ok := info["revoked"].(bool); ok {
			revoked = &v
		}
		if v, ok := info["allowedToPost"].(bool); ok {
			allowedToPost = &v
		}
		if v, ok := info["canStartThreads"].(bool); ok {
			canStartThreads = &v
		}
		if v, ok := info["isMaster"].(bool); ok {
			isMaster = &v
		}
		if v, ok := info["allowedToUploadFiles"].(bool); ok {
			allowedToUploadFiles = &v
		}

		id := ctx.Param("id")

		err = uc.db.UpdatePublicKeyPolicy(context.Background(), id, revoked, allowedToPost, canStartThreads, isMaster, allowedToUploadFiles)
		if err != nil {
			panic(err)
		}

		ctx.Status(203)
	}
}

func discoverKeys(uc *UserlessCtx) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		_, quiet := ctx.GetQuery("quiet")

		skip, limit := getLimits(ctx)

		keys, err := uc.db.FindPublicKeys(context.Background(), nil, nil, skip, limit, quiet)
		if err != nil {
			panic(err)
		}

		for _, key := range keys {
			if quiet {
				_, err := ctx.Writer.WriteString(fmt.Sprintf("%s\n", key.KeyID))
				if err != nil {
					panic(err)
				}
			} else {
				_, err := ctx.Writer.WriteString(fmt.Sprintf("%s | %s <%s> (%s)\n", key.KeyID, key.Name, key.Email, key.Comment))
				if err != nil {
					panic(err)
				}
			}
		}

		ctx.Status(200)
	}
}
