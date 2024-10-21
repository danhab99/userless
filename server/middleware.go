package main

import (
	"context"
	"userless/server/prisma/db"

	"github.com/gin-gonic/gin"
)

func threadMiddleware(uc UserlessCtx) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		hash := ctx.Params.ByName("hash")

		thread, err := uc.client.Thread.FindFirst(
			db.Thread.Hash.Equals(hash),
		).Exec(context.Background())

		if err != nil {
			panic(err)
		}

		ctx.Set("thread", thread)
		ctx.Next()
	}
}

func keyMiddleware(uc UserlessCtx) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		id := ctx.Params.ByName("id")

		key, err := uc.client.PublicKey.FindFirst(
			db.PublicKey.KeyID.Equals(id),
		).Exec(context.Background())

		if err != nil {
			panic(err)
		}

		ctx.Set("key", key)
		ctx.Next()
	}
}

func fileMiddleware(uc UserlessCtx) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		hash := ctx.Params.ByName("hash")

		file, err := uc.client.File.FindFirst(
			db.File.Hash.Equals(hash),
		).Exec(context.Background())

		if err != nil {
			panic(err)
		}

		ctx.Set("file", file)
		ctx.Next()
	}
}
