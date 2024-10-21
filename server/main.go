package main

import (
	"github.com/gin-gonic/gin"
)

func main() {

	ctx := NewUserlessCtx()

	route := gin.Default()

	hashGroup := route.Group("/thread/:hash", hashMiddleware(ctx))

	keyGroup := route.Group("/key/:id", keyMiddleware(ctx))

	fileGroup := route.Group("/file/:hash", fileMiddleware(ctx))

	route.Run("0.0.0.0:9000")
}
