package main

import (
	"context"
	"fmt"
	"strconv"
	"userless/server/prisma/db"

	"github.com/ProtonMail/go-crypto/openpgp"
	"github.com/gin-gonic/gin"
	"github.com/pelletier/go-toml/v2"
)

func getKey(uc *UserlessCtx) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		defer ctx.Done()
		keyRaw, ok := ctx.Get("key")
		if !ok {
			panic("key not set")
		}

		key := keyRaw.(*db.PublicKeyModel)
		ctx.Writer.WriteString(key.ArmoredKey)
		ctx.Status(200)
	}
}

func getKeyThreads(uc *UserlessCtx) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		defer ctx.Done()
		keyRaw, ok := ctx.Get("key")
		if !ok {
			panic("key not set")
		}
		key := keyRaw.(*db.PublicKeyModel)

		query := uc.client.Thread.FindMany(
			db.Thread.SignedBy.Where(
				db.PublicKey.ID.Equals(key.ID),
			),
		).Select(
			db.Thread.Hash.Field(),
		)

		skipStr, ok := ctx.GetQuery("skip")
		if ok {
			s, err := strconv.Atoi(skipStr)
			if err != nil {
				panic(err)
			}
			query = query.Skip(s)
		}

		takeStr, ok := ctx.GetQuery("take")
		if ok {
			s, err := strconv.Atoi(takeStr)
			if err != nil {
				panic(err)
			}
			query = query.Take(min(100, s))
		} else {
			query = query.Take(100)
		}

		threads, err := query.Exec(context.Background())
		if err != nil {
			panic(err)
		}

		ctx.Status(200)

		for _, thread := range threads {
			_, err := ctx.Writer.WriteString(thread.Hash + "\n")
			if err != nil {
				panic(err)
			}
		}
	}
}

func getKeyFiles(uc *UserlessCtx) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		defer ctx.Done()
		keyRaw, ok := ctx.Get("key")
		if !ok {
			panic("key not set")
		}
		key := keyRaw.(*db.PublicKeyModel)

		files, err := uc.client.File.FindMany(
			db.File.SignedBy.Where(
				db.PublicKey.ID.Equals(key.ID),
			),
		).Select(
			db.File.Hash.Field(),
		).Exec(context.Background())
		if err != nil {
			panic(err)
		}

		ctx.Status(200)

		for _, thread := range files {
			_, err := ctx.Writer.WriteString(thread.Hash + "\n")
			if err != nil {
				panic(err)
			}
		}
	}
}

func getKeyPolicy(uc *UserlessCtx) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		p, ok := ctx.Get("key")
		if !ok {
			panic("no key")
		}

		pk := p.(*db.PublicKeyModel)
		policy, ok := pk.Policy()
		if !ok {
			ctx.Status(404)
			return
		}

		ctx.TOML(200, policy)
	}
}

func patchKeyPolicy(uc *UserlessCtx) func(ctx *gin.Context) {
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

		var changes []db.PublicKeyPolicySetParam

		revoked, ok := info["revoked"].(bool)
		if ok {
			changes = append(changes, db.PublicKeyPolicy.Revoked.Set(revoked))
		}
		allowedToPost, ok := info["allowedToPost"].(bool)
		if ok {
			changes = append(changes, db.PublicKeyPolicy.AllowedToPost.Set(allowedToPost))
		}
		canStartThreads, ok := info["canStartThreads"].(bool)
		if ok {
			changes = append(changes, db.PublicKeyPolicy.CanStartThreads.Set(canStartThreads))
		}
		isMaster, ok := info["isMaster"].(bool)
		if ok {
			changes = append(changes, db.PublicKeyPolicy.IsMaster.Set(isMaster))
		}
		allowedToUploadFiles, ok := info["allowedToUploadFiles"].(bool)
		if ok {
			changes = append(changes, db.PublicKeyPolicy.AllowedToUploadFiles.Set(allowedToUploadFiles))
		}

		id := ctx.Param("id")

		client := uc.client

		_, err = client.PublicKeyPolicy.FindUnique(
			db.PublicKeyPolicy.ID.Equals(id),
		).Update(changes...).Exec(context.Background())
		if err != nil {
			panic(err)
		}

		ctx.Status(203)
	}
}

func discoverKeys(uc *UserlessCtx) func(ctx *gin.Context) {
	return func(ctx *gin.Context) {
		query := uc.client.PublicKey.FindMany()
		_, quiet := ctx.GetQuery("quiet")

		if quiet {
			query = query.Select(
				db.PublicKey.KeyID.Field(),
			)
		} else {
			query = query.Select(
				db.PublicKey.KeyID.Field(),
				db.PublicKey.Name.Field(),
				db.PublicKey.Email.Field(),
				db.PublicKey.Comment.Field(),
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

		keys, err := query.Exec(context.Background())
		if err != nil {
			panic(err)
		}

		for _, key := range keys {
			if quiet {
				_, err := ctx.Writer.WriteString(fmt.Sprintf("%s\n", key.KeyID))
				if err != nil {
					panic(err)
				}
			} else {
				_, err := ctx.Writer.WriteString(fmt.Sprintf("%s | %s <%s> (%s)", key.KeyID, key.Name, key.Email, key.Comment))
				if err != nil {
					panic(err)
				}
			}
		}

		ctx.Status(200)
	}
}
