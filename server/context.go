package main

import (
	"io"
	"log"
	"os"
	"userless/server/prisma/db"

	"github.com/minio/minio-go"
	"golang.org/x/crypto/openpgp"
)

type UserlessCtx struct {
	client      *db.PrismaClient
	minioClient *minio.Client
	bucketName  string
}

func NewUserlessCtx() UserlessCtx {
	client := db.NewClient()
	if err := client.Prisma.Connect(); err != nil {
		panic(err)
	}

	endpoint := os.Getenv("S3_ENDPOINT")
	accessKeyID := os.Getenv("S3_ACCESSKEY")
	secretAccessKey := os.Getenv("S3_SECRETKEY")
	useSSL := os.Getenv("S3_SSL")

	minioClient, err := minio.New(endpoint, accessKeyID, secretAccessKey, useSSL == "1")
	if err != nil {
		log.Fatalln(err)
	}

	return UserlessCtx{
		client:      client,
		minioClient: minioClient,
		bucketName:  os.Getenv("S3_BUCKET"),
	}
}

func (uc *UserlessCtx) VerifyCleartext(text io.Reader) {

	openpgp.ReadArmoredKeyRing()

	openpgp.ReadMessage(text, nil)
}
