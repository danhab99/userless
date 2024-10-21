package main

import "userless/server/prisma/db"

type UserlessCtx struct {
	client *db.PrismaClient
}

func NewUserlessCtx() UserlessCtx {
	client := db.NewClient()
	if err := client.Prisma.Connect(); err != nil {
		panic(err)
	}

	return UserlessCtx{client}
}
