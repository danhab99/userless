package main

import (
	"fmt"
	"time"

	"github.com/gin-gonic/gin"
)

func getFile(uc *UserlessCtx, suffix string) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		fileRaw, ok := ctx.Get("file")
		if !ok {
			panic("file not set")
		}

		file := fileRaw.(*File)
		url, err := uc.minioClient.PresignedGetObject(uc.bucketName, fmt.Sprintf("/file/%s%s", file.Hash, suffix), time.Hour*168, nil)
		if err != nil {
			panic(err)
		}

		ctx.Redirect(307, url.String())
	}
}

func discoverFiles(uc *UserlessCtx) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		_, quiet := ctx.GetQuery("quiet")

		skip, take := getLimits(ctx)
		files, err := uc.db.FindFiles(skip, take)
		if err != nil {
			panic(err)
		}

		for _, file := range files {
			if quiet {
				_, err := ctx.Writer.WriteString(fmt.Sprintf("%s\n", file.Hash))
				if err != nil {
					panic(err)
				}
			} else {
				mime := ""
				if file.MimeType.Valid {
					mime = file.MimeType.String
				}
				_, err := ctx.Writer.WriteString(fmt.Sprintf("%s %s %d\n", file.Hash, mime, file.Size))
				if err != nil {
					panic(err)
				}
			}
		}
	}
}
