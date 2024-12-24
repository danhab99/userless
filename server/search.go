package main

import (
	"context"
	"fmt"
	"strconv"
	"time"
	"userless/server/prisma/db"

	"github.com/gin-gonic/gin"
)

func searchThreadsHandler(uc *UserlessCtx, c Config) func(ctx *gin.Context) {
	client := uc.client
	config := c.SearchConfig

	return func(ctx *gin.Context) {
		defer ctx.Done()

		var query []db.ThreadWhereParam

		if config.FullTextSearch {
			bodyQuery := ctx.Query("body")
			if bodyQuery != "" {
				query = append(query, db.Thread.Body.Contains(bodyQuery))
			}
		}

		// if config.RegexSearch {
		// 	regexQuery := ctx.Query("regex")
		// 	if regexQuery != "" {
		// 		query = append(query, db.Thread.Body.)
		// 	}
		// }

		if config.EmailSearch {
			emailQuery := ctx.Query("email")
			if emailQuery != "" {
				query = append(query, db.Thread.SignedBy.Where(
					db.PublicKey.Email.Equals(emailQuery),
				))
			}
		}

		if config.KeyId {
			keyIdQuery := ctx.Query("keyId")
			if keyIdQuery != "" {
				query = append(query, db.Thread.SignedBy.Where(
					db.PublicKey.KeyID.Equals(keyIdQuery),
				))
			}
		}

		find := client.Thread.FindMany(query...).Select(
			db.Thread.Hash.Field(),
		).OrderBy(
			db.Thread.Timestamp.Order(db.SortOrderDesc),
		)

		skip := ctx.Query("skip")
		if skip != "" {
			s, err := strconv.Atoi(skip)
			if err != nil {
				panic(err)
			}
			find = find.Skip(s)
		}

		take := ctx.Query("take")
		if take != "" {
			s, err := strconv.Atoi(take)
			if err != nil {
				panic(err)
			}
			find = find.Take(s)
		}

		timeoutContext, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		res, err := find.Exec(timeoutContext)
		if err != nil {
			panic(err)
		}

		for _, thread := range res {
			ctx.Writer.WriteString(thread.Hash + "\n")
		}
	}
}

func searchPublicKeysHandler(uc *UserlessCtx, c Config) func(ctx *gin.Context) {
	client := uc.client
	config := c.SearchConfig

	return func(ctx *gin.Context) {
		defer ctx.Done()

		var query []db.PublicKeyWhereParam

		if config.EmailSearch {
			emailQuery := ctx.Query("email")
			if emailQuery != "" {
				query = append(query, db.PublicKey.Email.Equals(emailQuery))
			}
		}

		if config.KeyId {
			keyIdQuery := ctx.Query("keyId")
			if keyIdQuery != "" {
				query = append(query, db.PublicKey.KeyID.Equals(keyIdQuery))
			}
		}

		find := client.PublicKey.FindMany(query...).OrderBy(
			db.PublicKey.KeyID.Order(db.SortOrderDesc),
		)

		_, quiet := ctx.GetQuery("quiet")
		if quiet {
			find = find.Select(
				db.PublicKey.KeyID.Field(),
			)
		} else {
			find = find.Select(
				db.PublicKey.KeyID.Field(),
				db.PublicKey.Name.Field(),
				db.PublicKey.Email.Field(),
				db.PublicKey.Comment.Field(),
			)
		}

		skip := ctx.Query("skip")
		if skip != "" {
			s, err := strconv.Atoi(skip)
			if err != nil {
				panic(err)
			}
			find = find.Skip(s)
		}

		take := ctx.Query("take")
		if take != "" {
			s, err := strconv.Atoi(take)
			if err != nil {
				panic(err)
			}
			find = find.Take(s)
		}

		timeoutContext, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		res, err := find.Exec(timeoutContext)
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
