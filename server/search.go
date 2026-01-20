package main

import (
	"fmt"
	"strconv"

	"github.com/gin-gonic/gin"
)

func searchThreadsHandler(uc *UserlessCtx, c Config) func(ctx *gin.Context) {
	config := c.SearchConfig

	return func(ctx *gin.Context) {
		defer ctx.Done()

		bodyQuery := ""
		emailQuery := ""
		keyIdQuery := ""

		if config.FullTextSearch {
			bodyQuery = ctx.Query("body")
		}

		if config.EmailSearch {
			emailQuery = ctx.Query("email")
		}

		if config.KeyId {
			keyIdQuery = ctx.Query("keyId")
		}

		skip := 0
		take := 0

		skipStr := ctx.Query("skip")
		if skipStr != "" {
			s, err := strconv.Atoi(skipStr)
			if err != nil {
				panic(err)
			}
			skip = s
		}

		takeStr := ctx.Query("take")
		if takeStr != "" {
			s, err := strconv.Atoi(takeStr)
			if err != nil {
				panic(err)
			}
			take = s
		}

		res, err := uc.db.SearchThreads(bodyQuery, emailQuery, keyIdQuery, skip, take)
		if err != nil {
			panic(err)
		}

		for _, thread := range res {
			ctx.Writer.WriteString(thread.Hash + "\n")
		}
	}
}

func searchPublicKeysHandler(uc *UserlessCtx, c Config) func(ctx *gin.Context) {
	config := c.SearchConfig

	return func(ctx *gin.Context) {
		defer ctx.Done()

		emailQuery := ""
		keyIdQuery := ""

		if config.EmailSearch {
			emailQuery = ctx.Query("email")
		}

		if config.KeyId {
			keyIdQuery = ctx.Query("keyId")
		}

		skip := 0
		take := 0

		skipStr := ctx.Query("skip")
		if skipStr != "" {
			s, err := strconv.Atoi(skipStr)
			if err != nil {
				panic(err)
			}
			skip = s
		}

		takeStr := ctx.Query("take")
		if takeStr != "" {
			s, err := strconv.Atoi(takeStr)
			if err != nil {
				panic(err)
			}
			take = s
		}

		_, quiet := ctx.GetQuery("quiet")

		res, err := uc.db.SearchPublicKeys(emailQuery, keyIdQuery, skip, take)
		if err != nil {
			panic(err)
		}

		for _, key := range res {
			if quiet {
				_, err := ctx.Writer.WriteString(key.KeyID + "\n")
				if err != nil {
					panic(err)
				}
			} else {
				_, err := ctx.Writer.WriteString(fmt.Sprintf("%s | %s<%s> (%s)\n", key.KeyID, key.Name, key.Email, key.Comment))
				if err != nil {
					panic(err)
				}
			}
		}
	}
}
