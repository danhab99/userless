package main

import (
	"context"
	"userless/server/prisma/db"

	"github.com/gin-gonic/gin"
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
