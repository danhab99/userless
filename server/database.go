package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	_ "github.com/lib/pq"
)

var (
	ErrNotFound = errors.New("not found")
)

type Database struct {
	db *sql.DB
}

// Model types
type Thread struct {
	ID           string
	Body         string
	Hash         string
	ReplyTo      *string
	SignedByID   string
	Timestamp    time.Time
	Info         json.RawMessage
	ThreadPolicy *ThreadPolicy
}

type ThreadRef struct {
	ID         string
	Name       string
	ThreadHash string
	Advertise  bool
}

type ThreadPolicy struct {
	ID             string
	Visible        bool
	AcceptsReplies bool
	EncryptFor     []string
	PolicyEditors  []string
	Advertise      bool
	ThreadHash     *string
}

type PublicKey struct {
	ID         string
	ArmoredKey string
	Comment    string
	Email      string
	Finger     string
	KeyID      string
	Name       string
	PolicyID   *string
	Policy     *PublicKeyPolicy
}

type PublicKeyPolicy struct {
	ID                   string
	Revoked              bool
	AllowedToPost        bool
	CanStartThreads      bool
	IsMaster             bool
	AllowedToUploadFiles bool
	MaxFileSize          int64
}

type File struct {
	ID         string
	SignedByID string
	Hash       string
	Timestamp  time.Time
	Size       int64
	MimeType   *string
}

// NewDatabase creates a new database connection
func NewDatabase(connectionString string) (*Database, error) {
	db, err := sql.Open("postgres", connectionString)
	if err != nil {
		return nil, err
	}

	if err := db.Ping(); err != nil {
		return nil, err
	}

	return &Database{db: db}, nil
}

// Close closes the database connection
func (d *Database) Close() error {
	return d.db.Close()
}

// Thread operations

func (d *Database) CreateThread(ctx context.Context, body, hash, signedByID string, timestamp time.Time, replyTo *string, info json.RawMessage) (*Thread, error) {
	query := `
		INSERT INTO "Thread" (id, body, hash, "replyTo", "signedById", timestamp, info)
		VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)
		RETURNING id, body, hash, "replyTo", "signedById", timestamp, info
	`

	thread := &Thread{}
	err := d.db.QueryRowContext(ctx, query, body, hash, replyTo, signedByID, timestamp, info).Scan(
		&thread.ID, &thread.Body, &thread.Hash, &thread.ReplyTo, &thread.SignedByID, &thread.Timestamp, &thread.Info,
	)

	if err != nil {
		return nil, err
	}

	return thread, nil
}

func (d *Database) FindThreadByHash(ctx context.Context, hash string) (*Thread, error) {
	query := `
		SELECT t.id, t.body, t.hash, t."replyTo", t."signedById", t.timestamp, t.info,
		       tp.id, tp.visible, tp."acceptsReplies", tp."encryptFor", tp."policyEditors", tp.advertise, tp."threadHash"
		FROM "Thread" t
		LEFT JOIN "ThreadPolicy" tp ON tp."threadHash" = t.hash
		WHERE t.hash = $1
	`

	thread := &Thread{}
	var policyID, policyThreadHash sql.NullString
	var visible, acceptsReplies, advertise sql.NullBool
	var encryptFor, policyEditors []byte

	err := d.db.QueryRowContext(ctx, query, hash).Scan(
		&thread.ID,
		&thread.Body,
		&thread.Hash,
		&thread.ReplyTo,
		&thread.SignedByID,
		&thread.Timestamp,
		&thread.Info,
		&policyID,
		&visible,
		&acceptsReplies,
		&encryptFor,
		&policyEditors,
		&advertise,
		&policyThreadHash,
	)

	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}

	if policyID.Valid {
		var encryptForArr, policyEditorsArr []string
		if len(encryptFor) > 0 {
			json.Unmarshal(encryptFor, &encryptForArr)
		}
		if len(policyEditors) > 0 {
			json.Unmarshal(policyEditors, &policyEditorsArr)
		}

		thread.ThreadPolicy = &ThreadPolicy{
			ID:             policyID.String,
			Visible:        visible.Bool,
			AcceptsReplies: acceptsReplies.Bool,
			EncryptFor:     encryptForArr,
			PolicyEditors:  policyEditorsArr,
			Advertise:      advertise.Bool,
			ThreadHash:     &policyThreadHash.String,
		}
	}

	return thread, nil
}

func (d *Database) FindThreadsByReplyTo(ctx context.Context, hash string, skip, take int) ([]*Thread, error) {
	query := `
		SELECT id, body, hash, "replyTo", "signedById", timestamp, info
		FROM "Thread"
		WHERE "replyTo" = $1
		ORDER BY timestamp DESC
		OFFSET $2 LIMIT $3
	`

	rows, err := d.db.QueryContext(ctx, query, hash, skip, take)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var threads []*Thread
	for rows.Next() {
		thread := &Thread{}
		if err := rows.Scan(&thread.ID, &thread.Body, &thread.Hash, &thread.ReplyTo, &thread.SignedByID, &thread.Timestamp, &thread.Info); err != nil {
			return nil, err
		}
		threads = append(threads, thread)
	}

	return threads, rows.Err()
}

func (d *Database) FindThreadsByKeyID(ctx context.Context, keyID string, skip, take int) ([]*Thread, error) {
	query := `
		SELECT t.id, t.body, t.hash, t."replyTo", t."signedById", t.timestamp, t.info
		FROM "Thread" t
		JOIN "PublicKey" pk ON pk.id = t."signedById"
		WHERE pk.id = $1
		ORDER BY t.timestamp DESC
		OFFSET $2 LIMIT $3
	`

	rows, err := d.db.QueryContext(ctx, query, keyID, skip, take)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var threads []*Thread
	for rows.Next() {
		thread := &Thread{}
		if err := rows.Scan(&thread.ID, &thread.Body, &thread.Hash, &thread.ReplyTo, &thread.SignedByID, &thread.Timestamp, &thread.Info); err != nil {
			return nil, err
		}
		threads = append(threads, thread)
	}

	return threads, rows.Err()
}

// ThreadRef operations

func (d *Database) FindThreadRefByName(ctx context.Context, name string) (*ThreadRef, error) {
	query := `SELECT id, name, "threadHash", advertise FROM "ThreadRef" WHERE name = $1`

	ref := &ThreadRef{}
	err := d.db.QueryRowContext(ctx, query, name).Scan(&ref.ID, &ref.Name, &ref.ThreadHash, &ref.Advertise)

	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}

	return ref, nil
}

func (d *Database) FindAdvertisedThreadRefs(ctx context.Context) ([]*ThreadRef, error) {
	query := `SELECT id, name, "threadHash", advertise FROM "ThreadRef" WHERE advertise = true`

	rows, err := d.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var refs []*ThreadRef
	for rows.Next() {
		ref := &ThreadRef{}
		if err := rows.Scan(&ref.ID, &ref.Name, &ref.ThreadHash, &ref.Advertise); err != nil {
			return nil, err
		}
		refs = append(refs, ref)
	}

	return refs, rows.Err()
}

// ThreadPolicy operations

func (d *Database) CreateThreadPolicy(ctx context.Context, threadID string) (*ThreadPolicy, error) {
	query := `
INSERT INTO "ThreadPolicy" (
	id,
	"threadHash",
	visible,
	"acceptsReplies",
	"encryptFor",
	"policyEditors",
	advertise
)
SELECT
	gen_random_uuid(),
	t.hash,
	true,
	true,
	'{}'::text[],
	'{}'::text[],
	false
FROM "Thread" t
WHERE t.id = $1
RETURNING
	id,
	visible,
	"acceptsReplies",
	"encryptFor",
	"policyEditors",
	advertise,
	"threadHash";
	`

	policy := &ThreadPolicy{}

	// Scan raw JSON/array bytes from Postgres into []byte
	var encryptForBytes, policyEditorsBytes []byte
	var threadHash string

	err := d.db.QueryRowContext(ctx, query, threadID).Scan(
		&policy.ID,
		&policy.Visible,
		&policy.AcceptsReplies,
		&encryptForBytes,
		&policyEditorsBytes,
		&policy.Advertise,
		&threadHash,
	)
	if err != nil {
		return nil, err
	}

	// Always set the thread hash
	policy.ThreadHash = &threadHash

	// Unmarshal JSON/array into Go slices
	if len(encryptForBytes) > 0 {
		if err := json.Unmarshal(encryptForBytes, &policy.EncryptFor); err != nil {
			return nil, fmt.Errorf("unmarshal encryptFor: %w", err)
		}
	}

	if len(policyEditorsBytes) > 0 {
		if err := json.Unmarshal(policyEditorsBytes, &policy.PolicyEditors); err != nil {
			return nil, fmt.Errorf("unmarshal policyEditors: %w", err)
		}
	}

	return policy, nil
}

func (d *Database) UpdateThreadPolicy(ctx context.Context, threadHash string, visible *bool, acceptsReplies *bool, encryptFor []string, policyEditors []string, advertise *bool) error {
	updates := []string{}
	args := []interface{}{}
	argCount := 1

	if visible != nil {
		updates = append(updates, fmt.Sprintf("visible = $%d", argCount))
		args = append(args, *visible)
		argCount++
	}

	if acceptsReplies != nil {
		updates = append(updates, fmt.Sprintf("\"acceptsReplies\" = $%d", argCount))
		args = append(args, *acceptsReplies)
		argCount++
	}

	if encryptFor != nil {
		encryptForJSON, _ := json.Marshal(encryptFor)
		updates = append(updates, fmt.Sprintf("\"encryptFor\" = $%d", argCount))
		args = append(args, encryptForJSON)
		argCount++
	}

	if policyEditors != nil {
		policyEditorsJSON, _ := json.Marshal(policyEditors)
		updates = append(updates, fmt.Sprintf("\"policyEditors\" = $%d", argCount))
		args = append(args, policyEditorsJSON)
		argCount++
	}

	if advertise != nil {
		updates = append(updates, fmt.Sprintf("advertise = $%d", argCount))
		args = append(args, *advertise)
		argCount++
	}

	if len(updates) == 0 {
		return nil
	}

	query := `UPDATE "ThreadPolicy" SET ` + updates[0]
	for i := 1; i < len(updates); i++ {
		query += ", " + updates[i]
	}
	query += fmt.Sprintf(" WHERE \"threadHash\" = $%d", argCount)
	args = append(args, threadHash)

	_, err := d.db.ExecContext(ctx, query, args...)
	return err
}

func (d *Database) FindAdvertisedThreads(ctx context.Context) ([]*Thread, error) {
	query := `
		SELECT t.id, t.body, t.hash, t."replyTo", t."signedById", t.timestamp, t.info
		FROM "Thread" t
		JOIN "ThreadPolicy" tp ON tp."threadHash" = t.hash
		WHERE tp.advertise = true
	`

	rows, err := d.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var threads []*Thread
	for rows.Next() {
		thread := &Thread{}
		if err := rows.Scan(&thread.ID, &thread.Body, &thread.Hash, &thread.ReplyTo, &thread.SignedByID, &thread.Timestamp, &thread.Info); err != nil {
			return nil, err
		}
		threads = append(threads, thread)
	}

	return threads, rows.Err()
}

// PublicKey operations

func (d *Database) CreatePublicKey(ctx context.Context, armoredKey, comment, email, finger, keyID, name, policyID string) (*PublicKey, error) {
	query := `
		INSERT INTO "PublicKey" (id, "armoredKey", comment, email, finger, "keyId", name, "policyId")
		VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)
		RETURNING id, "armoredKey", comment, email, finger, "keyId", name, "policyId"
	`

	pk := &PublicKey{}
	var nullPolicyID sql.NullString

	err := d.db.QueryRowContext(ctx, query, armoredKey, comment, email, finger, keyID, name, policyID).Scan(
		&pk.ID, &pk.ArmoredKey, &pk.Comment, &pk.Email, &pk.Finger, &pk.KeyID, &pk.Name, &nullPolicyID,
	)

	if err != nil {
		return nil, err
	}

	if nullPolicyID.Valid {
		pk.PolicyID = &nullPolicyID.String
	}

	return pk, nil
}

func (d *Database) FindPublicKeyByKeyID(ctx context.Context, keyID string) (*PublicKey, error) {
	query := `
		SELECT pk.id, pk."armoredKey", pk.comment, pk.email, pk.finger, pk."keyId", pk.name, pk."policyId",
		       p.id, p.revoked, p."allowedToPost", p."canStartThreads", p."isMaster", p."allowedToUploadFiles", p."maxFileSize"
		FROM "PublicKey" pk
		LEFT JOIN "PublicKeyPolicy" p ON p.id = pk."policyId"
		WHERE pk."keyId" = $1
	`

	pk := &PublicKey{}
	var policyID, policyPolicyID sql.NullString
	var revoked, allowedToPost, canStartThreads, isMaster, allowedToUploadFiles sql.NullBool
	var maxFileSize sql.NullInt64

	err := d.db.QueryRowContext(ctx, query, keyID).Scan(
		&pk.ID, &pk.ArmoredKey, &pk.Comment, &pk.Email, &pk.Finger, &pk.KeyID, &pk.Name, &policyID,
		&policyPolicyID, &revoked, &allowedToPost, &canStartThreads, &isMaster, &allowedToUploadFiles, &maxFileSize,
	)

	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}

	if policyID.Valid {
		pk.PolicyID = &policyID.String
	}

	if policyPolicyID.Valid {
		pk.Policy = &PublicKeyPolicy{
			ID:                   policyPolicyID.String,
			Revoked:              revoked.Bool,
			AllowedToPost:        allowedToPost.Bool,
			CanStartThreads:      canStartThreads.Bool,
			IsMaster:             isMaster.Bool,
			AllowedToUploadFiles: allowedToUploadFiles.Bool,
			MaxFileSize:          maxFileSize.Int64,
		}
	}

	return pk, nil
}

func (d *Database) FindPublicKeyByFinger(ctx context.Context, finger string) (*PublicKey, error) {
	query := `
		SELECT pk.id, pk."armoredKey", pk.comment, pk.email, pk.finger, pk."keyId", pk.name, pk."policyId",
		       p.id, p.revoked, p."allowedToPost", p."canStartThreads", p."isMaster", p."allowedToUploadFiles", p."maxFileSize"
		FROM "PublicKey" pk
		LEFT JOIN "PublicKeyPolicy" p ON p.id = pk."policyId"
		WHERE pk.finger = $1
	`

	pk := &PublicKey{}
	var policyID, policyPolicyID sql.NullString
	var revoked, allowedToPost, canStartThreads, isMaster, allowedToUploadFiles sql.NullBool
	var maxFileSize sql.NullInt64

	err := d.db.QueryRowContext(ctx, query, finger).Scan(
		&pk.ID, &pk.ArmoredKey, &pk.Comment, &pk.Email, &pk.Finger, &pk.KeyID, &pk.Name, &policyID,
		&policyPolicyID, &revoked, &allowedToPost, &canStartThreads, &isMaster, &allowedToUploadFiles, &maxFileSize,
	)

	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}

	if policyID.Valid {
		pk.PolicyID = &policyID.String
	}

	if policyPolicyID.Valid {
		pk.Policy = &PublicKeyPolicy{
			ID:                   policyPolicyID.String,
			Revoked:              revoked.Bool,
			AllowedToPost:        allowedToPost.Bool,
			CanStartThreads:      canStartThreads.Bool,
			IsMaster:             isMaster.Bool,
			AllowedToUploadFiles: allowedToUploadFiles.Bool,
			MaxFileSize:          maxFileSize.Int64,
		}
	}

	return pk, nil
}

func (d *Database) FindPublicKeyByKeyIDOrFinger(ctx context.Context, id string) (*PublicKey, error) {
	query := `
		SELECT pk.id, pk."armoredKey", pk.comment, pk.email, pk.finger, pk."keyId", pk.name, pk."policyId",
		       p.id, p.revoked, p."allowedToPost", p."canStartThreads", p."isMaster", p."allowedToUploadFiles", p."maxFileSize"
		FROM "PublicKey" pk
		LEFT JOIN "PublicKeyPolicy" p ON p.id = pk."policyId"
		WHERE pk."keyId" = $1 OR pk.finger = $1
	`

	pk := &PublicKey{}
	var policyID, policyPolicyID sql.NullString
	var revoked, allowedToPost, canStartThreads, isMaster, allowedToUploadFiles sql.NullBool
	var maxFileSize sql.NullInt64

	err := d.db.QueryRowContext(ctx, query, id).Scan(
		&pk.ID, &pk.ArmoredKey, &pk.Comment, &pk.Email, &pk.Finger, &pk.KeyID, &pk.Name, &policyID,
		&policyPolicyID, &revoked, &allowedToPost, &canStartThreads, &isMaster, &allowedToUploadFiles, &maxFileSize,
	)

	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}

	if policyID.Valid {
		pk.PolicyID = &policyID.String
	}

	if policyPolicyID.Valid {
		pk.Policy = &PublicKeyPolicy{
			ID:                   policyPolicyID.String,
			Revoked:              revoked.Bool,
			AllowedToPost:        allowedToPost.Bool,
			CanStartThreads:      canStartThreads.Bool,
			IsMaster:             isMaster.Bool,
			AllowedToUploadFiles: allowedToUploadFiles.Bool,
			MaxFileSize:          maxFileSize.Int64,
		}
	}

	return pk, nil
}

func (d *Database) FindPublicKeys(ctx context.Context, email, keyID *string, skip, take int, quiet bool) ([]*PublicKey, error) {
	query := `SELECT `
	if quiet {
		query += `pk."keyId" `
	} else {
		query += `pk."keyId", pk.name, pk.email, pk.comment `
	}
	query += `FROM "PublicKey" pk WHERE 1=1 `

	args := []interface{}{}
	argCount := 1

	if email != nil {
		query += fmt.Sprintf("AND pk.email = $%d ", argCount)
		args = append(args, *email)
		argCount++
	}

	if keyID != nil {
		query += fmt.Sprintf("AND pk.\"keyId\" = $%d ", argCount)
		args = append(args, *keyID)
		argCount++
	}

	query += fmt.Sprintf("ORDER BY pk.\"keyId\" DESC OFFSET $%d LIMIT $%d", argCount, argCount+1)
	args = append(args, skip, take)

	rows, err := d.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var keys []*PublicKey
	for rows.Next() {
		pk := &PublicKey{}
		if quiet {
			if err := rows.Scan(&pk.KeyID); err != nil {
				return nil, err
			}
		} else {
			if err := rows.Scan(&pk.KeyID, &pk.Name, &pk.Email, &pk.Comment); err != nil {
				return nil, err
			}
		}
		keys = append(keys, pk)
	}

	return keys, rows.Err()
}

// PublicKeyPolicy operations

func (d *Database) CreatePublicKeyPolicy(ctx context.Context) (*PublicKeyPolicy, error) {
	query := `
		INSERT INTO "PublicKeyPolicy" (id, revoked, "allowedToPost", "canStartThreads", "isMaster", "allowedToUploadFiles", "maxFileSize")
		VALUES (gen_random_uuid(), false, true, true, false, true, 1000000)
		RETURNING id, revoked, "allowedToPost", "canStartThreads", "isMaster", "allowedToUploadFiles", "maxFileSize"
	`

	policy := &PublicKeyPolicy{}
	err := d.db.QueryRowContext(ctx, query).Scan(
		&policy.ID, &policy.Revoked, &policy.AllowedToPost, &policy.CanStartThreads, &policy.IsMaster, &policy.AllowedToUploadFiles, &policy.MaxFileSize,
	)

	if err != nil {
		return nil, err
	}

	return policy, nil
}

func (d *Database) DeletePublicKeyPolicy(ctx context.Context, id string) error {
	query := `DELETE FROM "PublicKeyPolicy" WHERE id = $1`
	_, err := d.db.ExecContext(ctx, query, id)
	return err
}

func (d *Database) UpdatePublicKeyPolicy(ctx context.Context, id string, revoked, allowedToPost, canStartThreads, isMaster, allowedToUploadFiles *bool) error {
	updates := []string{}
	args := []interface{}{}
	argCount := 1

	if revoked != nil {
		updates = append(updates, fmt.Sprintf("revoked = $%d", argCount))
		args = append(args, *revoked)
		argCount++
	}

	if allowedToPost != nil {
		updates = append(updates, fmt.Sprintf("\"allowedToPost\" = $%d", argCount))
		args = append(args, *allowedToPost)
		argCount++
	}

	if canStartThreads != nil {
		updates = append(updates, fmt.Sprintf("\"canStartThreads\" = $%d", argCount))
		args = append(args, *canStartThreads)
		argCount++
	}

	if isMaster != nil {
		updates = append(updates, fmt.Sprintf("\"isMaster\" = $%d", argCount))
		args = append(args, *isMaster)
		argCount++
	}

	if allowedToUploadFiles != nil {
		updates = append(updates, fmt.Sprintf("\"allowedToUploadFiles\" = $%d", argCount))
		args = append(args, *allowedToUploadFiles)
		argCount++
	}

	if len(updates) == 0 {
		return nil
	}

	query := `UPDATE "PublicKeyPolicy" SET ` + updates[0]
	for i := 1; i < len(updates); i++ {
		query += ", " + updates[i]
	}
	query += fmt.Sprintf(" WHERE id = $%d", argCount)
	args = append(args, id)

	_, err := d.db.ExecContext(ctx, query, args...)
	return err
}

// File operations

func (d *Database) UpsertFile(ctx context.Context, hash, signedByKeyID string, timestamp time.Time, size int64, mimeType *string) (*File, error) {
	query := `
		INSERT INTO "File" (id, "signedById", hash, timestamp, size, "mimeType")
		SELECT gen_random_uuid(), pk.finger, $1, $2, $3, $4
		FROM "PublicKey" pk
		WHERE pk."keyId" = $5
		ON CONFLICT (hash) DO UPDATE SET
			timestamp = EXCLUDED.timestamp,
			size = EXCLUDED.size,
			"mimeType" = EXCLUDED."mimeType"
		RETURNING id, "signedById", hash, timestamp, size, "mimeType"
	`

	file := &File{}
	var nullMimeType sql.NullString

	err := d.db.QueryRowContext(ctx, query, hash, timestamp, size, mimeType, signedByKeyID).Scan(
		&file.ID, &file.SignedByID, &file.Hash, &file.Timestamp, &file.Size, &nullMimeType,
	)

	if err != nil {
		return nil, err
	}

	if nullMimeType.Valid {
		file.MimeType = &nullMimeType.String
	}

	return file, nil
}

func (d *Database) FindFileByHash(ctx context.Context, hash string) (*File, error) {
	query := `SELECT id, "signedById", hash, timestamp, size, "mimeType" FROM "File" WHERE hash = $1`

	file := &File{}
	var nullMimeType sql.NullString

	err := d.db.QueryRowContext(ctx, query, hash).Scan(
		&file.ID, &file.SignedByID, &file.Hash, &file.Timestamp, &file.Size, &nullMimeType,
	)

	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}

	if nullMimeType.Valid {
		file.MimeType = &nullMimeType.String
	}

	return file, nil
}

func (d *Database) FindFilesByKeyID(ctx context.Context, keyID string, skip, take int) ([]*File, error) {
	query := `
		SELECT f.id, f."signedById", f.hash, f.timestamp, f.size, f."mimeType"
		FROM "File" f
		JOIN "PublicKey" pk ON pk.id = f."signedById"
		WHERE pk.id = $1
		ORDER BY f.timestamp DESC
		OFFSET $2 LIMIT $3
	`

	rows, err := d.db.QueryContext(ctx, query, keyID, skip, take)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var files []*File
	for rows.Next() {
		file := &File{}
		var nullMimeType sql.NullString
		if err := rows.Scan(&file.ID, &file.SignedByID, &file.Hash, &file.Timestamp, &file.Size, &nullMimeType); err != nil {
			return nil, err
		}
		if nullMimeType.Valid {
			file.MimeType = &nullMimeType.String
		}
		files = append(files, file)
	}

	return files, rows.Err()
}

func (d *Database) FindFiles(ctx context.Context, skip, take int, quiet bool) ([]*File, error) {
	query := `SELECT hash`
	if !quiet {
		query += `, "mimeType", size`
	}
	query += ` FROM "File" ORDER BY timestamp DESC OFFSET $1 LIMIT $2`

	rows, err := d.db.QueryContext(ctx, query, skip, take)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var files []*File
	for rows.Next() {
		file := &File{}
		if quiet {
			if err := rows.Scan(&file.Hash); err != nil {
				return nil, err
			}
		} else {
			var nullMimeType sql.NullString
			if err := rows.Scan(&file.Hash, &nullMimeType, &file.Size); err != nil {
				return nil, err
			}
			if nullMimeType.Valid {
				file.MimeType = &nullMimeType.String
			}
		}
		files = append(files, file)
	}

	return files, rows.Err()
}

// Search operations

func (d *Database) SearchThreads(ctx context.Context, body, email, keyID *string, skip, take int) ([]*Thread, error) {
	query := `
		SELECT t.id, t.body, t.hash, t."replyTo", t."signedById", t.timestamp, t.info
		FROM "Thread" t
	`

	joins := []string{}
	wheres := []string{}
	args := []interface{}{}
	argCount := 1

	if email != nil || keyID != nil {
		joins = append(joins, `JOIN "PublicKey" pk ON pk.id = t."signedById"`)
	}

	if body != nil {
		wheres = append(wheres, fmt.Sprintf("t.body LIKE $%d", argCount))
		args = append(args, "%"+*body+"%")
		argCount++
	}

	if email != nil {
		wheres = append(wheres, fmt.Sprintf("pk.email = $%d", argCount))
		args = append(args, *email)
		argCount++
	}

	if keyID != nil {
		wheres = append(wheres, fmt.Sprintf("pk.\"keyId\" = $%d", argCount))
		args = append(args, *keyID)
		argCount++
	}

	if len(joins) > 0 {
		query += " " + joins[0]
	}

	if len(wheres) > 0 {
		query += " WHERE " + wheres[0]
		for i := 1; i < len(wheres); i++ {
			query += " AND " + wheres[i]
		}
	}

	query += fmt.Sprintf(" ORDER BY t.timestamp DESC OFFSET $%d LIMIT $%d", argCount, argCount+1)
	args = append(args, skip, take)

	rows, err := d.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var threads []*Thread
	for rows.Next() {
		thread := &Thread{}
		if err := rows.Scan(&thread.ID, &thread.Body, &thread.Hash, &thread.ReplyTo, &thread.SignedByID, &thread.Timestamp, &thread.Info); err != nil {
			return nil, err
		}
		threads = append(threads, thread)
	}

	return threads, rows.Err()
}
