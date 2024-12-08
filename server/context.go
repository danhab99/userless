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

func NewUserlessCtx() *UserlessCtx {
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

	return &UserlessCtx{
		client:      client,
		minioClient: minioClient,
		bucketName:  os.Getenv("S3_BUCKET"),
	}
}

func (uc *UserlessCtx) VerifyCleartext(msg *openpgp.MessageDetails) (body string, signedBy *openpgp.Key, signedByDb *db.PublicKeyModel) {
	dpk, err := uc.getSigner(msg)
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

func (uc *UserlessCtx) getSigner(msg *openpgp.MessageDetails) (*db.PublicKeyModel, error) {
	id := strconv.FormatUint(msg.SignedByKeyId, 16)

	return uc.client.PublicKey.FindUnique(
		db.PublicKey.KeyID.Equals(id),
	).Exec(context.Background())
}

func spoofArmoredSignature(clearText string) string {
	clearLine := strings.Split(clearText, "\n")
	var armoredSignature string
	var seenStart, seenEnd bool

	for _, line := range clearLine {
		if line == "-----BEGIN PGP SIGNATURE-----" {
			seenStart = true
		}
		if line == "-----END PGP SIGNATURE-----" {
			seenEnd = true
		}
		if seenStart && !seenEnd {
			armoredSignature += line + "\n"
		}
	}

	armoredSignature += "-----END PGP SIGNATURE-----"

	return armoredSignature
}
