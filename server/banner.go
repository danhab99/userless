package main

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/url"
	"os"
	"time"
	"userless/server/prisma/db"

	"github.com/gin-gonic/gin"
	"github.com/pelletier/go-toml/v2"
)

func banner(uc *UserlessCtx, config Config) func(ctx *gin.Context) {
	f, err := os.Open(config.BannerPath)
	if err != nil {
		panic(err)
	}

	banner, err := io.ReadAll(f)
	if err != nil {
		panic(err)
	}

	var body string

	go func() {
		for {
			publicThreads, err := uc.client.Thread.FindMany(
				db.Thread.ThreadPolicy.Where(
					db.ThreadPolicy.Advertise.Equals(true),
				),
			).Exec(context.Background())
			if err != nil {
				panic(err)
			}

			publicThreadRefs, err := uc.client.ThreadRef.FindMany(
				db.ThreadRef.Advertise.Equals(true),
			).With(
				db.ThreadRef.Thread.Fetch(),
			).Exec(context.Background())

			pubThreadHashes := make([]string, len(publicThreads) + len(publicThreadRefs))
			for i, tm := range publicThreads {
				pubThreadHashes[i] = tm.Hash
			}
			for i, tm := range publicThreadRefs {
				pubThreadHashes[i+len(publicThreads)] = tm.Name
			}

			var u url.URL
			if config.FileConfig.S3Config.SSL {
				u.Scheme = "https"
			} else {
				u.Scheme = "http"
			}
			u.Host = fmt.Sprintf("%s:%d", config.FileConfig.S3Config.Host, config.FileConfig.S3Config.Port)
			u.Path = config.FileConfig.S3Config.Bucket

			var searchArgs []string
			if config.SearchConfig.FullTextSearch {
				searchArgs = append(searchArgs, "body")
			}
			if config.SearchConfig.EmailSearch {
				searchArgs = append(searchArgs, "email")
			}
			if config.SearchConfig.KeyId {
				searchArgs = append(searchArgs, "keyId")
			}
			if config.SearchConfig.RegexSearch {
				searchArgs = append(searchArgs, "regex")
			}

			info := map[string]any{
				// "bucket":  fmt.Sprintf("s3+https://%s/%s", os.Getenv("S3_ENDPOINT"), os.Getenv("S3_BUCKET")),
				"keys": map[string]any{
					"enabled":   config.KeyConfig.Enable,
					"discovery": config.KeyConfig.EnableDiscovery,
				},
				"threads": map[string]any{
					"enabled":   config.ThreadsConfig.Enable,
					"discovery": config.ThreadsConfig.EnableDiscovery,
					"frontpage": pubThreadHashes,
				},
				"files": map[string]any{
					"enabled":   config.ThreadsConfig.Enable,
					"discovery": config.ThreadsConfig.EnableDiscovery,
					"bucket":    u.String(),
				},
				"search": map[string]any{
					"threads": config.SearchConfig.SearchThreads,
					"keys":    config.SearchConfig.SearchKeys,
					"args":    searchArgs,
				},
			}

			tomlBuf := bytes.NewBuffer([]byte{})
			t := toml.NewEncoder(tomlBuf).SetArraysMultiline(true).SetIndentSymbol("\t").SetIndentTables(false)
			err = t.Encode(info)
			if err != nil {
				panic(err)
			}

			body = fmt.Sprintf("%s\n\n%s\n\n%s", tomlBuf.String(), DELIMITER, string(banner))

			time.Sleep(10 * time.Second)
		}
	}()

	return func(ctx *gin.Context) {
		defer ctx.Done()
		ctx.String(200, body)
	}
}
