package main

import (
	"context"
	"strconv"
	"userless/server/prisma/db"

	"github.com/gin-gonic/gin"
	"github.com/pelletier/go-toml/v2"
	"golang.org/x/crypto/openpgp"
)

func getThead(uc *UserlessCtx) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		threadRaw, ok := ctx.Get("thread")
		if !ok {
			panic("thread not set")
		}

		thread := threadRaw.(*db.ThreadModel)
		ctx.Writer.WriteString(thread.Body)
		ctx.Status(200)
	}
}

func getThreadReplies(uc *UserlessCtx) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		threadRaw, ok := ctx.Get("thread")
		if !ok {
			panic("thread not set")
		}
		thread := threadRaw.(*db.ThreadModel)

		query := uc.client.Thread.FindMany(
			db.Thread.ReplyTo.Equals(thread.Hash),
		).Select(
			db.Thread.Hash.Field(),
		).OrderBy(
			db.Thread.Timestamp.Order(db.DESC),
		)

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

			query = query.Take(take)
		} else {
			query = query.Take(100)
		}

		threads, err := query.Exec(context.Background())
		if err != nil {
			panic(err)
		}

		for _, thread := range threads {
			_, err := ctx.Writer.WriteString(thread.Hash + "\n")
			if err != nil {
				panic(err)
			}
		}

		ctx.Status(200)
	}
}

func getThreadPolicy(uc *UserlessCtx) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		threadRaw, ok := ctx.Get("thread")
		if !ok {
			panic("thread not set")
		}
		thread := threadRaw.(*db.ThreadModel)

		encoder := toml.NewEncoder(ctx.Writer)
		encoder.Encode(thread.ThreadPolicy)

		ctx.Status(200)
	}
}

func patchThreadPolicy(uc *UserlessCtx) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		msg, err := openpgp.ReadMessage(ctx.Request.Body, nil, nil, nil)
		if err != nil {
			panic(err)
		}

		body, _, _ := uc.VerifyCleartext(msg)

		var info map[string]interface{}
		err = toml.Unmarshal([]byte(body), &info)
		if err != nil {
			panic(err)
		}

		var changes []db.ThreadPolicySetParam

		visible, ok := info["visible"].(bool)
		if ok {
			changes = append(changes, db.ThreadPolicy.Visible.Set(visible))
		}

		acceptsReplies, ok := info["acceptsReplies"].(bool)
		if ok {
			changes = append(changes, db.ThreadPolicy.AcceptsReplies.Set(acceptsReplies))
		}

		encryptFor, ok := info["encryptFor"].([]string)
		if ok {
			changes = append(changes, db.ThreadPolicy.EncryptFor.Set(encryptFor))
		}

		policyEditors, ok := info["policyEditors"].([]string)
		if ok {
			changes = append(changes, db.ThreadPolicy.PolicyEditors.Set(policyEditors))
		}

		advertise, ok := info["advertise"].(bool)
		if ok {
			changes = append(changes, db.ThreadPolicy.Advertise.Set(advertise))
		}

		hash := ctx.Param("hash")

		client := uc.client

		_, err = client.ThreadPolicy.FindUnique(
			db.ThreadPolicy.ThreadHash.Equals(hash),
		).Update(changes...).Exec(context.Background())
		if err != nil {
			panic(err)
		}

		ctx.Status(203)
	}
}
