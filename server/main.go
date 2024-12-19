package main

import (
	"flag"
	"log"
	"os"
	"time"

	"github.com/gin-contrib/cors"
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

	route.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PATCH"},
		AllowHeaders:     []string{"Origin"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		AllowOriginFunc: func(origin string) bool {
			return true
		},
		MaxAge: 12 * time.Hour,
	}))

	route.GET("/", banner(ctx, *bannerFileName))

	route.POST("/post", postHandler(ctx))
	route.POST("/register", register(ctx))
	route.POST("/upload", uploadHandler(ctx))

	threadGroup := route.Group("/thread/:hash", threadMiddleware(ctx))
	threadGroup.GET("", getThead(ctx))
	threadGroup.GET("/replies", getThreadReplies(ctx))
	threadGroup.GET("/policy", getThreadPolicy(ctx))
	threadGroup.PATCH("/policy", patchThreadPolicy(ctx))

	if os.Getenv("DISCOVER_KEYS") != "" {
		route.GET("/keys", discoverKeys(ctx))
	}
	keyGroup := route.Group("/key/:id", keyMiddleware(ctx))
	keyGroup.GET("", getKey(ctx))
	keyGroup.GET("/files", getKeyFiles(ctx))
	keyGroup.GET("/threads", getKeyThreads(ctx))
	keyGroup.GET("/policy", getKeyPolicy(ctx))
	keyGroup.PATCH("/policy", patchKeyPolicy(ctx))

	if os.Getenv("DISCOVER_FILES") != "" {
		route.GET("/files", discoverFiles(ctx))
	}
	fileGroup := route.Group("/file/:hash", fileMiddleware(ctx))
	fileGroup.GET("", getFile(ctx, ""))
	fileGroup.GET("/sig", getFile(ctx, "_sig"))

	err = route.Run(*host)
	if err != nil {
		panic(err)
	}

}
