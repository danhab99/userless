package main

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"os"
	"strconv"
	"strings"
	"userless/server/prisma/db"

	"github.com/minio/minio-go"
	"github.com/pelletier/go-toml/v2"
	"github.com/steebchen/prisma-client-go/runtime/types"
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

func (uc *UserlessCtx) uploadThread(threadClearText io.Reader) *db.ThreadModel {
	fmt.Println("Uploading thread", threadClearText)
	msg, err := openpgp.ReadMessage(threadClearText, nil, nil, nil)
	if err != nil {
		panic(err)
	}

	ownerKeyDb, err := uc.getSigner(msg)
	if err != nil {
		log.Fatal(err)
	}
	if ownerKeyDb == nil {
		log.Fatal("cannot find owner key")
	}

	content, _, keyDb := uc.VerifyCleartext(msg)

	timestamp := msg.Signature.CreationTime

	delimiter := strings.Index(content, DELIMITER)
	var info map[string]interface{}
	if delimiter > 0 {
		infoToml := content[:delimiter]
		err = toml.NewDecoder(bytes.NewBufferString(infoToml)).Decode(&info)
		if err != nil {
			log.Fatal(err)
		}
	}

	hasher := sha256.New()
	hasher.Write([]byte(content))
	hash := hasher.Sum(nil)

	params := []db.ThreadSetParam{}
	replyTo, hasReplyTo := info["replyTo"].(string)
	if hasReplyTo {
		params = append(params, db.Thread.ReplyTo.Set(replyTo))
	}

	infoBytes := bytes.NewBuffer([]byte{})
	err = json.NewEncoder(infoBytes).Encode(info)
	if err != nil {
		panic(err)
	}

	x := json.RawMessage(infoBytes.Bytes())
	xx := types.JSON(x)

	params = append(params, db.Thread.Info.Set(xx))

	threadDb, err := uc.client.Thread.CreateOne(
		db.Thread.Body.Set(content),
		db.Thread.Hash.Set(string(hash)),
		db.Thread.SignedBy.Link(
			db.PublicKey.KeyID.Equals(keyDb.KeyID),
		),
		db.Thread.Timestamp.Set(timestamp),
		params...,
	).Exec(context.Background())

	return threadDb
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
