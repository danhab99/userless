package main

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"strings"

	"github.com/gin-gonic/gin"
)

func isHash(t string) bool {
	m, err := regexp.Match("\\b[a-fA-F0-9]{64}\\b", []byte(t))
	if err != nil {
		panic(err)
	}
	return m
}

func threadMiddleware(uc *UserlessCtx) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		hash := ctx.Params.ByName("hash")
		var thread *Thread
		var err error

		if isHash(hash) {
			thread, err = uc.db.FindThreadByHash(context.Background(), strings.ToLower(hash))

			if err != nil {
				if errors.Is(err, ErrNotFound) {
					ctx.String(404, "thread not found")
					ctx.Abort()
					return
				}
				panic(err)
			}

			ctx.Set("thread", thread)
		} else {
			ref, err := uc.db.FindThreadRefByName(context.Background(), hash)
			if err != nil {
				if errors.Is(err, ErrNotFound) {
					ctx.String(404, "thread not found")
					ctx.Abort()
					return
				}
				panic(err)
			}

			thread, err = uc.db.FindThreadByHash(context.Background(), ref.ThreadHash)
			if err != nil {
				panic(err)
			}
		}

		ctx.Set("thread", thread)
		ctx.Next()
	}
}

func keyMiddleware(uc *UserlessCtx) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		id := ctx.Params.ByName("id")

		key, err := uc.db.FindPublicKeyByKeyIDOrFinger(context.Background(), strings.ToLower(id))

		if err != nil {
			if errors.Is(err, ErrNotFound) {
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

		file, err := uc.db.FindFileByHash(context.Background(), hash)

		if err != nil {
			if errors.Is(err, ErrNotFound) {
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
