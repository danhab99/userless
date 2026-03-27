package main

import (
	"context"
	"fmt"
	"strconv"

	"github.com/ProtonMail/go-crypto/openpgp"
	"github.com/gin-gonic/gin"
	"github.com/pelletier/go-toml/v2"
)

func getThead(_ *UserlessCtx) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		threadRaw, ok := ctx.Get("thread")
		if !ok {
			panic("thread not set")
		}

		thread := threadRaw.(*Thread)
		ctx.Writer.WriteString(thread.Body)
		ctx.Status(200)
	}
}

func getThreadParents(uc *UserlessCtx) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		defer ctx.Done()

		threadRaw, ok := ctx.Get("thread")
		if !ok {
			panic("thread not set")
		}
		thread := threadRaw.(*Thread)
		parentCount := 10
		if countStr := ctx.Query("count"); countStr != "" {
			if n, err := strconv.Atoi(countStr); err == nil && n > 0 {
				parentCount = n
			}
		}

		var err error

		for i := 0; i < parentCount && thread.ReplyTo != nil; i++ {
			fmt.Println("SEARCHING FOR PARENT THREAD", thread.Hash, *thread.ReplyTo)
			thread, err = uc.db.FindThreadByHash(context.Background(), *thread.ReplyTo)
			fmt.Println("FOUND", thread.Hash)

			s := fmt.Sprintf("%s\n", thread.Hash)
			ctx.Writer.WriteString(s)

			if err != nil {
				panic(err)
			}
		}
	}
}

func getThreadReplies(uc *UserlessCtx) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		threadRaw, ok := ctx.Get("thread")
		if !ok {
			panic("thread not set")
		}
		thread := threadRaw.(*Thread)

		skip, take := getLimits(ctx)

		threads, err := uc.db.FindThreadsByReplyTo(context.Background(), thread.Hash, skip, take)
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

func getThreadPolicy(_ *UserlessCtx) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		defer ctx.Done()
		threadRaw, ok := ctx.Get("thread")
		if !ok {
			panic("thread not set")
		}

		thread := threadRaw.(*Thread)
		policy := thread.ThreadPolicy
		fmt.Println("Thread policy", policy, ok)
		if policy == nil {
			ctx.Status(404)
			return
		}

		m := StructToMap(policy)
		innerPolicy, ok := m["innerThreadPolicy"]
		if !ok || innerPolicy == nil {
			// No inner policy, use the top-level policy fields directly
			delete(m, "threadHash")
			delete(m, "iD")
			ctx.TOML(200, m)
			return
		}

		policyMap := innerPolicy.(map[string]any)
		delete(policyMap, "threadHash")
		delete(policyMap, "iD")

		ctx.TOML(200, policyMap)
	}
}

func patchThreadPolicy(uc *UserlessCtx) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		msg, err := openpgp.ReadMessage(ctx.Request.Body, nil, nil, nil)
		if err != nil {
			panic(err)
		}

		body, _, _ := uc.VerifyCleartext(msg)

		var info map[string]any
		err = toml.Unmarshal([]byte(body), &info)
		if err != nil {
			panic(err)
		}

		var visible, acceptsReplies, advertise *bool
		var encryptFor, policyEditors []string

		if v, ok := info["visible"].(bool); ok {
			visible = &v
		}

		if v, ok := info["acceptsReplies"].(bool); ok {
			acceptsReplies = &v
		}

		if v, ok := info["encryptFor"].([]string); ok {
			encryptFor = v
		}

		if v, ok := info["policyEditors"].([]string); ok {
			policyEditors = v
		}

		if v, ok := info["advertise"].(bool); ok {
			advertise = &v
		}

		hash := ctx.Param("hash")

		err = uc.db.UpdateThreadPolicy(context.Background(), hash, visible, acceptsReplies, encryptFor, policyEditors, advertise)
		if err != nil {
			panic(err)
		}

		ctx.Status(203)
	}
}
