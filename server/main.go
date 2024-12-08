package main

import (
	"log"

	"github.com/gin-gonic/gin"
)

func main() {
	log.SetFlags(log.Lshortfile | log.Lmicroseconds)
	ctx := NewUserlessCtx()

	route := gin.Default()

	route.POST("/post", postHandler(ctx))
	route.POST("/register", register(ctx))
	threadGroup := route.Group("/thread/:hash", threadMiddleware(ctx))
	threadGroup.GET("/", getThead(ctx))
	threadGroup.GET("/replies", getThreadReplies(ctx))
	threadGroup.GET("/policy", getThreadPolicy(ctx))
	threadGroup.PATCH("/policy", patchThreadPolicy(ctx))

	keyGroup := route.Group("/key/:id", keyMiddleware(ctx))
	keyGroup.GET("/", getKey(ctx))
	keyGroup.GET("/files", getKeyFiles(ctx))
	keyGroup.GET("/threads", getKeyThreads(ctx))

	fileGroup := route.Group("/file/:hash", fileMiddleware(ctx))
	fileGroup.GET("/", getFile(ctx, ""))
	fileGroup.GET("/sig", getFile(ctx, "_sig"))

	route.Run("0.0.0.0:9000")
}
