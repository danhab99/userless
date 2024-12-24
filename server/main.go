package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/pelletier/go-toml/v2"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		panic(err)
	}

	log.SetFlags(log.Lshortfile | log.Lmicroseconds)

	configPath := flag.String("config-path", "/etc/userless.toml", "")

	flag.Parse()

	configFile, err := os.Open(*configPath)
	if err != nil {
		panic(err)
	}

	var config Config
	err = toml.NewDecoder(configFile).Decode(&config)
	if err != nil {
		panic(err)
	}

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

	route.GET("/", banner(ctx, config.BannerPath))

	if config.FileConfig.Enable && config.KeyConfig.Enable && config.ThreadsConfig.Enable && config.FileConfig.EnableUpload && config.KeyConfig.EnableRegister && config.ThreadsConfig.EnablePost {
		log.Fatalln("No endpoints enabled")
	}

	if config.ThreadsConfig.EnablePost {
		route.POST("/post", postHandler(ctx, config))
	}
	if config.KeyConfig.EnableRegister {
		route.POST("/register", register(ctx, config))
	}
	if config.FileConfig.EnableUpload {
		route.POST("/upload", uploadHandler(ctx))
	}
	if config.SearchConfig.Enable {
		route.GET("/search/threads", searchThreadsHandler(ctx, config))
		route.GET("/search/keys", searchPublicKeysHandler(ctx, config))
	}

	if config.ThreadsConfig.Enable {
		threadGroup := route.Group("/thread/:hash", threadMiddleware(ctx))
		threadGroup.GET("", getThead(ctx))
		threadGroup.GET("/replies", getThreadReplies(ctx))
		threadGroup.GET("/policy", getThreadPolicy(ctx))
		threadGroup.PATCH("/policy", patchThreadPolicy(ctx))
	}

	if config.KeyConfig.Enable {
		if config.KeyConfig.EnableDiscovery {
			route.GET("/keys", discoverKeys(ctx))
		}
		keyGroup := route.Group("/key/:id", keyMiddleware(ctx))
		keyGroup.GET("", getKey(ctx))
		if config.FileConfig.EnableDiscovery {
			keyGroup.GET("/files", getKeyFiles(ctx))
		}
		if config.ThreadsConfig.EnableDiscovery {
			keyGroup.GET("/threads", getKeyThreads(ctx))
		}
		keyGroup.GET("/policy", getKeyPolicy(ctx))
		keyGroup.PATCH("/policy", patchKeyPolicy(ctx))
	}

	if config.FileConfig.Enable {
		if config.FileConfig.EnableDiscovery {
			route.GET("/files", discoverFiles(ctx))
		}
		fileGroup := route.Group("/file/:hash", fileMiddleware(ctx))
		fileGroup.GET("", getFile(ctx, ""))
		fileGroup.GET("/sig", getFile(ctx, "_sig"))
	}

	if config.Host == "" {
		config.Host = "127.0.0.1"
	}
	if config.Port == 0 {
		config.Port = 4444
	}

	err = route.Run(fmt.Sprintf("%s:%d", config.Host, config.Port))
	if err != nil {
		panic(err)
	}

}
