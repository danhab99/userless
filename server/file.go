package main

import (
	"context"
	"fmt"
	"strconv"
	"time"
	"userless/server/prisma/db"

	"github.com/gin-gonic/gin"
)

func getFile(uc *UserlessCtx, suffix string) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		fileRaw, ok := ctx.Get("file")
		if !ok {
			panic("file not set")
		}

		file := fileRaw.(*db.FileModel)
		url, err := uc.minioClient.PresignedGetObject(uc.bucketName, fmt.Sprintf("/file/%s%s", file.Hash, suffix), time.Hour*168, nil)
		if err != nil {
			panic(err)
		}

		ctx.Redirect(307, url.String())
	}
}

func discoverFiles(uc *UserlessCtx) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		query := uc.client.File.FindMany()

		_, quiet := ctx.GetQuery("quiet")

		if quiet {
			query = query.Select(
				db.File.Hash.Field(),
			)
		} else {
			query = query.Select(
				db.File.Hash.Field(),
				db.File.MimeType.Field(),
				db.File.Size.Field(),
			)
		}

		skipStr, hasSkip := ctx.GetQuery("skip")
		if hasSkip {
			skip, err := strconv.Atoi(skipStr)
			if err != nil {
				panic(err)
			}

			query = query.Skip(skip)
		}

		takeStr, hasTake := ctx.GetQuery("take")
		if hasTake {
			take, err := strconv.Atoi(takeStr)
			if err != nil {
				panic(err)
			}

			query = query.Take(min(take, MAX))
		} else {
			query = query.Take(MAX)
		}

		files, err := query.Exec(context.Background())
		if err != nil {
			panic(err)
		}

		for _, file := range files {
			var err error
			if quiet {
				_, err = ctx.Writer.WriteString(fmt.Sprintf("%s\n", file.Hash))
			} else {
				mime, _ := file.MimeType()
				_, err = ctx.Writer.WriteString(fmt.Sprintf("%s %s %d", file.Hash, mime, file.Size))
			}
			if err != nil {
				panic(err)
			}
		}

	}
}
