package main

import (
	"fmt"

	"github.com/gin-gonic/gin"
)

func postHandler(uc *UserlessCtx) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		defer ctx.Done()

		thread := uc.uploadThread(ctx.Request.Body)

		ctx.Redirect(307, fmt.Sprintf("/thread/%s", thread.Hash))
	}
}
