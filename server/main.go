package main

import (
	"github.com/gin-gonic/gin"
)

func main() {

	ctx := NewUserlessCtx()

	route := gin.Default()

	threadGroup := route.Group("/thread/:hash", threadMiddleware(ctx))
	threadGroup.GET("/", getThead(ctx))
	threadGroup.GET("/replies", getThreadReplies(ctx))
	threadGroup.GET("/policy", getThreadPolicy(ctx))

	keyGroup := route.Group("/key/:id", keyMiddleware(ctx))
	keyGroup.GET("/", getKey(ctx))

	fileGroup := route.Group("/file/:hash", fileMiddleware(ctx))
	fileGroup.GET("/", getFile(ctx))

	route.Run("0.0.0.0:9000")
}
