package main

import (
	"userless/server/prisma/db"

	"github.com/gin-gonic/gin"
)

func getKey(uc UserlessCtx) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		keyRaw, ok := ctx.Get("key")
		if !ok {
			panic("key not set")
		}

		key := keyRaw.(*db.PublicKeyModel)
		ctx.Writer.WriteString(key.ArmoredKey)
		ctx.Status(200)
	}
}
