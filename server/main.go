package main

import (
	"flag"
	"log"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		panic(err)
	}

	log.SetFlags(log.Lshortfile | log.Lmicroseconds)

	host := flag.String("host", ":3000", "host:port for to listen to")
	bannerFileName := flag.String("banner", "", "banner text file")

	flag.Parse()

	ctx := NewUserlessCtx()

	route := gin.Default()

	route.GET("/", banner(ctx, *bannerFileName))

	route.POST("/post", postHandler(ctx))
	route.POST("/register", register(ctx))
	route.POST("/upload", uploadHandler(ctx))

	threadGroup := route.Group("/thread/:hash", threadMiddleware(ctx))
	threadGroup.GET("", getThead(ctx))
	threadGroup.GET("/replies", getThreadReplies(ctx))
	threadGroup.GET("/policy", getThreadPolicy(ctx))
	threadGroup.PATCH("/policy", patchThreadPolicy(ctx))

	keyGroup := route.Group("/key/:id", keyMiddleware(ctx))
	keyGroup.GET("", getKey(ctx))
	keyGroup.GET("/files", getKeyFiles(ctx))
	keyGroup.GET("/threads", getKeyThreads(ctx))
	keyGroup.GET("/policy", getKeyPolicy(ctx))
	keyGroup.PATCH("/policy", patchKeyPolicy(ctx))

	fileGroup := route.Group("/file/:hash", fileMiddleware(ctx))
	fileGroup.GET("", getFile(ctx, ""))
	fileGroup.GET("/sig", getFile(ctx, "_sig"))

	err = route.Run(*host)
	if err != nil {
		panic(err)
	}

}
