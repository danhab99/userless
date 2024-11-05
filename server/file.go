package main

import (
	"fmt"
	"time"
	"userless/server/prisma/db"

	"github.com/gin-gonic/gin"
)

func getFile(uc UserlessCtx, suffix string) func(ctx *gin.Context) {
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
