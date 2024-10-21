package main

import (
	"userless/server/prisma/db"

	"github.com/gin-gonic/gin"
)

func getThead(uc UserlessCtx) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		threadRaw, ok := ctx.Get("thread")
		if !ok {
			panic("thread not set")
		}

		thread := threadRaw.(*db.ThreadModel)
		ctx.Writer.WriteString(thread.Body)
		ctx.Status(200)
	}
}
