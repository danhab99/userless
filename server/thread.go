package main

import (
	"fmt"

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

func getThreadParents(_ *UserlessCtx) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		defer ctx.Done()

		threadRaw, ok := ctx.Get("thread")
		if !ok {
			panic("thread not set")
		}
		thread := threadRaw.(*Thread)
		parentCount := ctx.GetInt("count")

		for i := 1; i < parentCount && thread.Parent != nil; i++ {
			s := fmt.Sprintf("%s\n", thread.Hash)
			ctx.Writer.WriteString(s)
			thread = thread.Parent
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
		threads, err := uc.db.FindThreadReplies(thread.Hash, skip, take)
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
		fmt.Println("Thread policy", policy)
		if policy == nil {
			ctx.Status(404)
			return
		}

		m := map[string]any{
			"visible":        policy.Visible,
			"acceptsReplies": policy.AcceptsReplies,
			"encryptFor":     policy.EncryptFor,
			"policyEditors":  policy.PolicyEditors,
			"advertise":      policy.Advertise,
		}

		ctx.TOML(200, m)
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

		changes := make(map[string]interface{})

		if visible, ok := info["visible"].(bool); ok {
			changes["visible"] = visible
		}

		if acceptsReplies, ok := info["acceptsReplies"].(bool); ok {
			changes["accepts_replies"] = acceptsReplies
		}

		if encryptFor, ok := info["encryptFor"].([]string); ok {
			changes["encrypt_for"] = encryptFor
		}

		if policyEditors, ok := info["policyEditors"].([]string); ok {
			changes["policy_editors"] = policyEditors
		}

		if advertise, ok := info["advertise"].(bool); ok {
			changes["advertise"] = advertise
		}

		hash := ctx.Param("hash")

		err = uc.db.UpdateThreadPolicy(hash, changes)
		if err != nil {
			panic(err)
		}

		ctx.Status(203)
	}
}
