package main

import (
	"context"
	"io"
	"log"
	"os"
	"strconv"
	"strings"
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

func (uc *UserlessCtx) VerifyCleartext(text io.Reader) (body string, signedBy *openpgp.Key, signedByDb *db.PublicKeyModel) {
	msg, err := openpgp.ReadMessage(text, nil, nil, nil)
	if err != nil {
		panic(err)
	}

	id := strconv.FormatUint(msg.SignedByKeyId, 16)

	dpk, err := uc.client.PublicKey.FindUnique(
		db.PublicKey.KeyID.Equals(id),
	).Exec(context.Background())
	if err != nil {
		panic(err)
	}

	key, err := openpgp.ReadArmoredKeyRing(strings.NewReader(dpk.ArmoredKey))
	if err != nil {
		panic(err)
	}

	msg, err = openpgp.ReadMessage(text, key, nil, nil)
	if err != nil {
		panic(err)
	}

	bodyBytes, err := io.ReadAll(msg.UnverifiedBody)
	if err != nil {
		panic(err)
	}
	body = string(bodyBytes)

	signedByDb = dpk
	signedBy = msg.SignedBy

	return
}
