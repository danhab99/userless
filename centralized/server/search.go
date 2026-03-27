package main

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

func searchThreadsHandler(uc *UserlessCtx, c Config) func(ctx *gin.Context) {
	config := c.SearchConfig

	return func(ctx *gin.Context) {
		defer ctx.Done()

		var bodyQuery, emailQuery, keyIDQuery *string

		if config.FullTextSearch {
			if bq := ctx.Query("body"); bq != "" {
				bodyQuery = &bq
			}
		}

		if config.EmailSearch {
			if eq := ctx.Query("email"); eq != "" {
				emailQuery = &eq
			}
		}

		if config.KeyId {
			if kq := ctx.Query("keyId"); kq != "" {
				keyIDQuery = &kq
			}
		}

		skip := 0
		if skipStr := ctx.Query("skip"); skipStr != "" {
			s, err := strconv.Atoi(skipStr)
			if err != nil {
				panic(err)
			}
			skip = s
		}

		take := 100
		if takeStr := ctx.Query("take"); takeStr != "" {
			s, err := strconv.Atoi(takeStr)
			if err != nil {
				panic(err)
			}
			take = s
		}

		timeoutContext, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		res, err := uc.db.SearchThreads(timeoutContext, bodyQuery, emailQuery, keyIDQuery, skip, take)
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

		var emailQuery, keyIDQuery *string

		if config.EmailSearch {
			if eq := ctx.Query("email"); eq != "" {
				emailQuery = &eq
			}
		}

		if config.KeyId {
			if kq := ctx.Query("keyId"); kq != "" {
				keyIDQuery = &kq
			}
		}

		_, quiet := ctx.GetQuery("quiet")

		skip := 0
		if skipStr := ctx.Query("skip"); skipStr != "" {
			s, err := strconv.Atoi(skipStr)
			if err != nil {
				panic(err)
			}
			skip = s
		}

		take := 100
		if takeStr := ctx.Query("take"); takeStr != "" {
			s, err := strconv.Atoi(takeStr)
			if err != nil {
				panic(err)
			}
			take = s
		}

		timeoutContext, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		res, err := uc.db.FindPublicKeys(timeoutContext, emailQuery, keyIDQuery, skip, take, quiet)
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
