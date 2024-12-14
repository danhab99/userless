package main

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"os"
	"userless/server/prisma/db"

	"github.com/gin-gonic/gin"
	"github.com/pelletier/go-toml/v2"
)

func banner(uc *UserlessCtx, bannerFile string) func(ctx *gin.Context) {
	f, err := os.Open(bannerFile)
	if err != nil {
		panic(err)
	}

	body, err := io.ReadAll(f)
	if err != nil {
		panic(err)
	}

	return func(ctx *gin.Context) {

		publicThreads, err := uc.client.Thread.FindMany(
			db.Thread.ThreadPolicy.Where(
				db.ThreadPolicy.Advertise.Equals(true),
			),
		).Exec(context.Background())
		if err != nil {
			panic(err)
		}

		pubThreadHashes := make([]string, len(publicThreads))
		for i, tm := range publicThreads {
			pubThreadHashes[i] = tm.Hash
		}

		info := map[string]any{
			"threads": pubThreadHashes,
		}

		tomlBuf := bytes.NewBuffer([]byte{})
		err = toml.NewEncoder(tomlBuf).Encode(info)
		if err != nil {
			panic(err)
		}

		ctx.String(200, fmt.Sprintf("%s\n\n%s\n\n%s", string(body), DELIMITER, tomlBuf.String()))
	}
}
