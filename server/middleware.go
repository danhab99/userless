package main

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"userless/server/prisma/db"

	"github.com/gin-gonic/gin"
)

func threadMiddleware(uc *UserlessCtx) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		hash := ctx.Params.ByName("hash")

		thread, err := uc.client.Thread.FindFirst(
			db.Thread.Hash.Equals(strings.ToLower(hash)),
		).With(
			db.Thread.ThreadPolicy.Fetch(),
		).Exec(context.Background())

		if err != nil {
			if errors.Is(err, db.ErrNotFound) {
				ctx.String(404, "thread not found")
				ctx.Abort()
				return
			}
			panic(err)
		}

		ctx.Set("thread", thread)
		ctx.Next()
	}
}

func keyMiddleware(uc *UserlessCtx) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		id := ctx.Params.ByName("id")

		key, err := uc.client.PublicKey.FindFirst(
			db.PublicKey.Or(
				db.PublicKey.KeyID.Equals(strings.ToLower(id)),
				db.PublicKey.Finger.Equals(strings.ToLower(id)),
			),
		).With(
			db.PublicKey.Policy.Fetch(),
		).Exec(context.Background())

		if err != nil {
			if errors.Is(err, db.ErrNotFound) {
				ctx.String(404, "public key not found")
				ctx.Abort()
				fmt.Println("RETURN 404")
				return
			}
			panic(err)
		}

		ctx.Set("key", key)
		ctx.Next()
	}
}

func fileMiddleware(uc *UserlessCtx) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		hash := ctx.Params.ByName("hash")

		file, err := uc.client.File.FindFirst(
			db.File.Hash.Equals(hash),
		).Exec(context.Background())

		if err != nil {
			if errors.Is(err, db.ErrNotFound) {
				ctx.String(404, "file not found")
				ctx.Abort()
				return
			}
			panic(err)
		}

		ctx.Set("file", file)
		ctx.Next()
	}
}
