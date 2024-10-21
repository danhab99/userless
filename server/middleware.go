package main

import "github.com/gin-gonic/gin"

func hashMiddleware(uc UserlessCtx) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		ctx.Set
	}
}

func keyMiddleware(uc UserlessCtx) func(ctx *gin.Context) {

}

func fileMiddleware(uc UserlessCtx) func(ctx *gin.Context) {

}
