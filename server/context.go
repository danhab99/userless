package main

import (
	"context"
	"io"
	"log"
	"os"
	"strconv"
	"strings"

	"github.com/ProtonMail/go-crypto/openpgp"
	"github.com/minio/minio-go"
)

type UserlessCtx struct {
	db          *Database
	minioClient *minio.Client
	bucketName  string
}

func NewUserlessCtx() *UserlessCtx {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL environment variable not set")
	}

	db, err := NewDatabase(dbURL)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
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
		db:          db,
		minioClient: minioClient,
		bucketName:  os.Getenv("S3_BUCKET"),
	}
}

func (uc *UserlessCtx) VerifyCleartext(msg *openpgp.MessageDetails) (body string, signedBy *openpgp.Key, signedByDb *PublicKey) {
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

func (uc *UserlessCtx) getSigner(msg *openpgp.MessageDetails) (*PublicKey, error) {
	id := strconv.FormatUint(msg.SignedByKeyId, 16)

	return uc.db.FindPublicKeyByKeyID(context.Background(), strings.ToLower(id))
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
