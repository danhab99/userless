package main

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	_ "github.com/lib/pq"
	_ "github.com/mattn/go-sqlite3"
)

var ErrNotFound = errors.New("not found")

type Database struct {
	db     *sql.DB
	driver string
}

// Model structs
type Thread struct {
	ID           string
	Body         string
	Hash         string
	ReplyTo      sql.NullString
	SignedByID   string
	Timestamp    time.Time
	Info         sql.NullString
	SignedBy     *PublicKey
	ThreadPolicy *ThreadPolicy
	Parent       *Thread
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
	ThreadHash     sql.NullString
}

type PublicKey struct {
	ID         string
	ArmoredKey string
	Comment    string
	Email      string
	Finger     string
	KeyID      string
	Name       string
	PolicyID   sql.NullString
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
	MimeType   sql.NullString
}

func NewDatabase(driver, dsn string) (*Database, error) {
	db, err := sql.Open(driver, dsn)
	if err != nil {
		return nil, err
	}

	if err := db.Ping(); err != nil {
		return nil, err
	}

	d := &Database{db: db, driver: driver}
	if err := d.initSchema(); err != nil {
		return nil, err
	}

	return d, nil
}

func (d *Database) Close() error {
	return d.db.Close()
}

func (d *Database) initSchema() error {
	schema := d.getSchema()
	_, err := d.db.Exec(schema)
	return err
}

func (d *Database) getSchema() string {
	if d.driver == "sqlite3" {
		return `
		CREATE TABLE IF NOT EXISTS public_key_policies (
			id TEXT PRIMARY KEY,
			revoked INTEGER NOT NULL DEFAULT 0,
			allowed_to_post INTEGER NOT NULL DEFAULT 1,
			can_start_threads INTEGER NOT NULL DEFAULT 1,
			is_master INTEGER NOT NULL DEFAULT 0,
			allowed_to_upload_files INTEGER NOT NULL DEFAULT 1,
			max_file_size INTEGER NOT NULL DEFAULT 1000000
		);

		CREATE TABLE IF NOT EXISTS public_keys (
			id TEXT PRIMARY KEY,
			armored_key TEXT NOT NULL UNIQUE,
			comment TEXT NOT NULL,
			email TEXT NOT NULL,
			finger TEXT NOT NULL UNIQUE,
			key_id TEXT NOT NULL UNIQUE,
			name TEXT NOT NULL,
			policy_id TEXT UNIQUE,
			FOREIGN KEY (policy_id) REFERENCES public_key_policies(id)
		);
		CREATE INDEX IF NOT EXISTS idx_public_keys_email ON public_keys(email);
		CREATE INDEX IF NOT EXISTS idx_public_keys_name ON public_keys(name);
		CREATE INDEX IF NOT EXISTS idx_public_keys_key_id ON public_keys(key_id);

		CREATE TABLE IF NOT EXISTS threads (
			id TEXT PRIMARY KEY,
			body TEXT NOT NULL,
			hash TEXT NOT NULL UNIQUE,
			reply_to TEXT,
			signed_by_id TEXT NOT NULL,
			timestamp DATETIME NOT NULL,
			info TEXT,
			FOREIGN KEY (reply_to) REFERENCES threads(hash),
			FOREIGN KEY (signed_by_id) REFERENCES public_keys(id)
		);
		CREATE INDEX IF NOT EXISTS idx_threads_reply_to ON threads(reply_to);
		CREATE INDEX IF NOT EXISTS idx_threads_signed_by_id ON threads(signed_by_id);
		CREATE INDEX IF NOT EXISTS idx_threads_timestamp ON threads(timestamp);

		CREATE TABLE IF NOT EXISTS thread_refs (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL UNIQUE,
			thread_hash TEXT NOT NULL,
			advertise INTEGER NOT NULL DEFAULT 1,
			FOREIGN KEY (thread_hash) REFERENCES threads(hash)
		);

		CREATE TABLE IF NOT EXISTS thread_policies (
			id TEXT PRIMARY KEY,
			visible INTEGER NOT NULL DEFAULT 1,
			accepts_replies INTEGER NOT NULL DEFAULT 1,
			encrypt_for TEXT NOT NULL DEFAULT '[]',
			policy_editors TEXT NOT NULL DEFAULT '[]',
			advertise INTEGER NOT NULL DEFAULT 0,
			thread_hash TEXT UNIQUE,
			FOREIGN KEY (thread_hash) REFERENCES threads(hash)
		);

		CREATE TABLE IF NOT EXISTS files (
			id TEXT PRIMARY KEY,
			signed_by_id TEXT NOT NULL,
			hash TEXT NOT NULL UNIQUE,
			timestamp DATETIME NOT NULL,
			size INTEGER NOT NULL,
			mime_type TEXT,
			FOREIGN KEY (signed_by_id) REFERENCES public_keys(finger)
		);
		`
	}

	// PostgreSQL schema
	return `
	CREATE TABLE IF NOT EXISTS public_key_policies (
		id TEXT PRIMARY KEY,
		revoked BOOLEAN NOT NULL DEFAULT FALSE,
		allowed_to_post BOOLEAN NOT NULL DEFAULT TRUE,
		can_start_threads BOOLEAN NOT NULL DEFAULT TRUE,
		is_master BOOLEAN NOT NULL DEFAULT FALSE,
		allowed_to_upload_files BOOLEAN NOT NULL DEFAULT TRUE,
		max_file_size BIGINT NOT NULL DEFAULT 1000000
	);

	CREATE TABLE IF NOT EXISTS public_keys (
		id TEXT PRIMARY KEY,
		armored_key TEXT NOT NULL UNIQUE,
		comment TEXT NOT NULL,
		email TEXT NOT NULL,
		finger TEXT NOT NULL UNIQUE,
		key_id TEXT NOT NULL UNIQUE,
		name TEXT NOT NULL,
		policy_id TEXT UNIQUE,
		FOREIGN KEY (policy_id) REFERENCES public_key_policies(id)
	);
	CREATE INDEX IF NOT EXISTS idx_public_keys_email ON public_keys(email);
	CREATE INDEX IF NOT EXISTS idx_public_keys_name ON public_keys(name);
	CREATE INDEX IF NOT EXISTS idx_public_keys_key_id ON public_keys(key_id);

	CREATE TABLE IF NOT EXISTS threads (
		id TEXT PRIMARY KEY,
		body TEXT NOT NULL,
		hash TEXT NOT NULL UNIQUE,
		reply_to TEXT,
		signed_by_id TEXT NOT NULL,
		timestamp TIMESTAMP NOT NULL,
		info JSONB,
		FOREIGN KEY (reply_to) REFERENCES threads(hash),
		FOREIGN KEY (signed_by_id) REFERENCES public_keys(id)
	);
	CREATE INDEX IF NOT EXISTS idx_threads_reply_to ON threads(reply_to);
	CREATE INDEX IF NOT EXISTS idx_threads_signed_by_id ON threads(signed_by_id);
	CREATE INDEX IF NOT EXISTS idx_threads_timestamp ON threads(timestamp);

	CREATE TABLE IF NOT EXISTS thread_refs (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL UNIQUE,
		thread_hash TEXT NOT NULL,
		advertise BOOLEAN NOT NULL DEFAULT TRUE,
		FOREIGN KEY (thread_hash) REFERENCES threads(hash)
	);

	CREATE TABLE IF NOT EXISTS thread_policies (
		id TEXT PRIMARY KEY,
		visible BOOLEAN NOT NULL DEFAULT TRUE,
		accepts_replies BOOLEAN NOT NULL DEFAULT TRUE,
		encrypt_for TEXT NOT NULL DEFAULT '[]',
		policy_editors TEXT NOT NULL DEFAULT '[]',
		advertise BOOLEAN NOT NULL DEFAULT FALSE,
		thread_hash TEXT UNIQUE,
		FOREIGN KEY (thread_hash) REFERENCES threads(hash)
	);

	CREATE TABLE IF NOT EXISTS files (
		id TEXT PRIMARY KEY,
		signed_by_id TEXT NOT NULL,
		hash TEXT NOT NULL UNIQUE,
		timestamp TIMESTAMP NOT NULL,
		size BIGINT NOT NULL,
		mime_type TEXT,
		FOREIGN KEY (signed_by_id) REFERENCES public_keys(finger)
	);
	`
}

// PublicKey operations
func (d *Database) CreatePublicKey(key *PublicKey) error {
	_, err := d.db.Exec(`
		INSERT INTO public_keys (id, armored_key, comment, email, finger, key_id, name, policy_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`, key.ID, key.ArmoredKey, key.Comment, key.Email, key.Finger, key.KeyID, key.Name, key.PolicyID)
	return err
}

func (d *Database) FindPublicKeyByKeyID(keyID string) (*PublicKey, error) {
	key := &PublicKey{}
	err := d.db.QueryRow(`
		SELECT id, armored_key, comment, email, finger, key_id, name, policy_id
		FROM public_keys WHERE key_id = $1
	`, keyID).Scan(&key.ID, &key.ArmoredKey, &key.Comment, &key.Email, &key.Finger, &key.KeyID, &key.Name, &key.PolicyID)
	
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}

	// Load policy if exists
	if key.PolicyID.Valid {
		policy, err := d.FindPublicKeyPolicyByID(key.PolicyID.String)
		if err == nil {
			key.Policy = policy
		}
	}

	return key, nil
}

func (d *Database) FindPublicKeyByFinger(finger string) (*PublicKey, error) {
	key := &PublicKey{}
	err := d.db.QueryRow(`
		SELECT id, armored_key, comment, email, finger, key_id, name, policy_id
		FROM public_keys WHERE finger = $1
	`, finger).Scan(&key.ID, &key.ArmoredKey, &key.Comment, &key.Email, &key.Finger, &key.KeyID, &key.Name, &key.PolicyID)
	
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}

	// Load policy if exists
	if key.PolicyID.Valid {
		policy, err := d.FindPublicKeyPolicyByID(key.PolicyID.String)
		if err == nil {
			key.Policy = policy
		}
	}

	return key, nil
}

func (d *Database) FindPublicKeyByKeyIDOrFinger(id string) (*PublicKey, error) {
	key := &PublicKey{}
	err := d.db.QueryRow(`
		SELECT id, armored_key, comment, email, finger, key_id, name, policy_id
		FROM public_keys WHERE key_id = $1 OR finger = $1
	`, id).Scan(&key.ID, &key.ArmoredKey, &key.Comment, &key.Email, &key.Finger, &key.KeyID, &key.Name, &key.PolicyID)
	
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}

	// Load policy if exists
	if key.PolicyID.Valid {
		policy, err := d.FindPublicKeyPolicyByID(key.PolicyID.String)
		if err == nil {
			key.Policy = policy
		}
	}

	return key, nil
}

func (d *Database) FindPublicKeys(skip, take int, quiet bool) ([]*PublicKey, error) {
	query := `SELECT id, armored_key, comment, email, finger, key_id, name, policy_id FROM public_keys`
	if take > 0 {
		query += fmt.Sprintf(" LIMIT %d OFFSET %d", take, skip)
	}

	rows, err := d.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var keys []*PublicKey
	for rows.Next() {
		key := &PublicKey{}
		if err := rows.Scan(&key.ID, &key.ArmoredKey, &key.Comment, &key.Email, &key.Finger, &key.KeyID, &key.Name, &key.PolicyID); err != nil {
			return nil, err
		}
		keys = append(keys, key)
	}

	return keys, rows.Err()
}

func (d *Database) SearchPublicKeys(email, keyID string, skip, take int) ([]*PublicKey, error) {
	query := `SELECT id, armored_key, comment, email, finger, key_id, name, policy_id FROM public_keys WHERE 1=1`
	args := []interface{}{}
	argCount := 1

	if email != "" {
		query += fmt.Sprintf(" AND email = $%d", argCount)
		args = append(args, email)
		argCount++
	}

	if keyID != "" {
		query += fmt.Sprintf(" AND key_id = $%d", argCount)
		args = append(args, keyID)
		argCount++
	}

	query += " ORDER BY key_id DESC"
	if take > 0 {
		query += fmt.Sprintf(" LIMIT %d OFFSET %d", take, skip)
	}

	rows, err := d.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var keys []*PublicKey
	for rows.Next() {
		key := &PublicKey{}
		if err := rows.Scan(&key.ID, &key.ArmoredKey, &key.Comment, &key.Email, &key.Finger, &key.KeyID, &key.Name, &key.PolicyID); err != nil {
			return nil, err
		}
		keys = append(keys, key)
	}

	return keys, rows.Err()
}

func (d *Database) FindPublicKeyThreads(keyID string, skip, take int) ([]*Thread, error) {
	query := `SELECT id, body, hash, reply_to, signed_by_id, timestamp, info FROM threads WHERE signed_by_id = $1`
	if take > 0 {
		query += fmt.Sprintf(" LIMIT %d OFFSET %d", take, skip)
	}

	rows, err := d.db.Query(query, keyID)
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

func (d *Database) FindPublicKeyFiles(keyID string, skip, take int) ([]*File, error) {
	query := `SELECT id, signed_by_id, hash, timestamp, size, mime_type FROM files WHERE signed_by_id = $1`
	if take > 0 {
		query += fmt.Sprintf(" LIMIT %d OFFSET %d", take, skip)
	}

	rows, err := d.db.Query(query, keyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var files []*File
	for rows.Next() {
		file := &File{}
		if err := rows.Scan(&file.ID, &file.SignedByID, &file.Hash, &file.Timestamp, &file.Size, &file.MimeType); err != nil {
			return nil, err
		}
		files = append(files, file)
	}

	return files, rows.Err()
}

// PublicKeyPolicy operations
func (d *Database) CreatePublicKeyPolicy() (*PublicKeyPolicy, error) {
	policy := &PublicKeyPolicy{
		ID:                   generateUUID(),
		Revoked:              false,
		AllowedToPost:        true,
		CanStartThreads:      true,
		IsMaster:             false,
		AllowedToUploadFiles: true,
		MaxFileSize:          1000000,
	}

	_, err := d.db.Exec(`
		INSERT INTO public_key_policies (id, revoked, allowed_to_post, can_start_threads, is_master, allowed_to_upload_files, max_file_size)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, policy.ID, policy.Revoked, policy.AllowedToPost, policy.CanStartThreads, policy.IsMaster, policy.AllowedToUploadFiles, policy.MaxFileSize)

	if err != nil {
		return nil, err
	}

	return policy, nil
}

func (d *Database) FindPublicKeyPolicyByID(id string) (*PublicKeyPolicy, error) {
	policy := &PublicKeyPolicy{}
	err := d.db.QueryRow(`
		SELECT id, revoked, allowed_to_post, can_start_threads, is_master, allowed_to_upload_files, max_file_size
		FROM public_key_policies WHERE id = $1
	`, id).Scan(&policy.ID, &policy.Revoked, &policy.AllowedToPost, &policy.CanStartThreads, &policy.IsMaster, &policy.AllowedToUploadFiles, &policy.MaxFileSize)
	
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	return policy, err
}

func (d *Database) UpdatePublicKeyPolicy(id string, updates map[string]interface{}) error {
	if len(updates) == 0 {
		return nil
	}

	query := "UPDATE public_key_policies SET "
	args := []interface{}{}
	argCount := 1

	first := true
	for key, val := range updates {
		if !first {
			query += ", "
		}
		query += fmt.Sprintf("%s = $%d", key, argCount)
		args = append(args, val)
		argCount++
		first = false
	}

	query += fmt.Sprintf(" WHERE id = $%d", argCount)
	args = append(args, id)

	_, err := d.db.Exec(query, args...)
	return err
}

func (d *Database) DeletePublicKeyPolicy(id string) error {
	_, err := d.db.Exec("DELETE FROM public_key_policies WHERE id = $1", id)
	return err
}

// Thread operations
func (d *Database) CreateThread(thread *Thread) error {
	_, err := d.db.Exec(`
		INSERT INTO threads (id, body, hash, reply_to, signed_by_id, timestamp, info)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, thread.ID, thread.Body, thread.Hash, thread.ReplyTo, thread.SignedByID, thread.Timestamp, thread.Info)
	return err
}

func (d *Database) FindThreadByHash(hash string) (*Thread, error) {
	thread := &Thread{}
	err := d.db.QueryRow(`
		SELECT id, body, hash, reply_to, signed_by_id, timestamp, info
		FROM threads WHERE hash = $1
	`, hash).Scan(&thread.ID, &thread.Body, &thread.Hash, &thread.ReplyTo, &thread.SignedByID, &thread.Timestamp, &thread.Info)
	
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}

	// Load policy if exists
	policy, err := d.FindThreadPolicyByHash(hash)
	if err == nil {
		thread.ThreadPolicy = policy
	}

	// Load parent if exists
	if thread.ReplyTo.Valid {
		parent, err := d.FindThreadByHash(thread.ReplyTo.String)
		if err == nil {
			thread.Parent = parent
		}
	}

	return thread, nil
}

func (d *Database) FindThreadReplies(hash string, skip, take int) ([]*Thread, error) {
	query := `SELECT id, body, hash, reply_to, signed_by_id, timestamp, info FROM threads WHERE reply_to = $1 ORDER BY timestamp DESC`
	if take > 0 {
		query += fmt.Sprintf(" LIMIT %d OFFSET %d", take, skip)
	}

	rows, err := d.db.Query(query, hash)
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

func (d *Database) SearchThreads(body, email, keyID string, skip, take int) ([]*Thread, error) {
	query := `SELECT t.id, t.body, t.hash, t.reply_to, t.signed_by_id, t.timestamp, t.info FROM threads t`
	args := []interface{}{}
	argCount := 1
	needsJoin := email != "" || keyID != ""

	if needsJoin {
		query += ` JOIN public_keys pk ON t.signed_by_id = pk.id`
	}

	query += ` WHERE 1=1`

	if body != "" {
		query += fmt.Sprintf(" AND t.body LIKE $%d", argCount)
		args = append(args, "%"+body+"%")
		argCount++
	}

	if email != "" {
		query += fmt.Sprintf(" AND pk.email = $%d", argCount)
		args = append(args, email)
		argCount++
	}

	if keyID != "" {
		query += fmt.Sprintf(" AND pk.key_id = $%d", argCount)
		args = append(args, keyID)
		argCount++
	}

	query += " ORDER BY t.timestamp DESC"
	if take > 0 {
		query += fmt.Sprintf(" LIMIT %d OFFSET %d", take, skip)
	}

	rows, err := d.db.Query(query, args...)
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
func (d *Database) FindThreadRefByName(name string) (*ThreadRef, error) {
	ref := &ThreadRef{}
	err := d.db.QueryRow(`
		SELECT id, name, thread_hash, advertise
		FROM thread_refs WHERE name = $1
	`, name).Scan(&ref.ID, &ref.Name, &ref.ThreadHash, &ref.Advertise)
	
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	return ref, err
}

// ThreadPolicy operations
func (d *Database) CreateThreadPolicy(policy *ThreadPolicy) error {
	encryptForJSON, _ := json.Marshal(policy.EncryptFor)
	policyEditorsJSON, _ := json.Marshal(policy.PolicyEditors)

	_, err := d.db.Exec(`
		INSERT INTO thread_policies (id, visible, accepts_replies, encrypt_for, policy_editors, advertise, thread_hash)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, policy.ID, policy.Visible, policy.AcceptsReplies, string(encryptForJSON), string(policyEditorsJSON), policy.Advertise, policy.ThreadHash)
	return err
}

func (d *Database) FindThreadPolicyByHash(hash string) (*ThreadPolicy, error) {
	policy := &ThreadPolicy{}
	var encryptForJSON, policyEditorsJSON string
	err := d.db.QueryRow(`
		SELECT id, visible, accepts_replies, encrypt_for, policy_editors, advertise, thread_hash
		FROM thread_policies WHERE thread_hash = $1
	`, hash).Scan(&policy.ID, &policy.Visible, &policy.AcceptsReplies, &encryptForJSON, &policyEditorsJSON, &policy.Advertise, &policy.ThreadHash)
	
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}

	json.Unmarshal([]byte(encryptForJSON), &policy.EncryptFor)
	json.Unmarshal([]byte(policyEditorsJSON), &policy.PolicyEditors)

	return policy, nil
}

func (d *Database) UpdateThreadPolicy(hash string, updates map[string]interface{}) error {
	if len(updates) == 0 {
		return nil
	}

	query := "UPDATE thread_policies SET "
	args := []interface{}{}
	argCount := 1

	first := true
	for key, val := range updates {
		if !first {
			query += ", "
		}

		// Handle array fields
		if key == "encrypt_for" || key == "policy_editors" {
			jsonVal, _ := json.Marshal(val)
			val = string(jsonVal)
		}

		query += fmt.Sprintf("%s = $%d", key, argCount)
		args = append(args, val)
		argCount++
		first = false
	}

	query += fmt.Sprintf(" WHERE thread_hash = $%d", argCount)
	args = append(args, hash)

	_, err := d.db.Exec(query, args...)
	return err
}

// File operations
func (d *Database) CreateFile(file *File) error {
	_, err := d.db.Exec(`
		INSERT INTO files (id, signed_by_id, hash, timestamp, size, mime_type)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, file.ID, file.SignedByID, file.Hash, file.Timestamp, file.Size, file.MimeType)
	return err
}

func (d *Database) UpsertFile(file *File) error {
	// Try insert first
	err := d.CreateFile(file)
	if err != nil {
		// If already exists, update
		_, err = d.db.Exec(`
			UPDATE files SET signed_by_id = $1, timestamp = $2, size = $3, mime_type = $4
			WHERE hash = $5
		`, file.SignedByID, file.Timestamp, file.Size, file.MimeType, file.Hash)
	}
	return err
}

func (d *Database) FindFileByHash(hash string) (*File, error) {
	file := &File{}
	err := d.db.QueryRow(`
		SELECT id, signed_by_id, hash, timestamp, size, mime_type
		FROM files WHERE hash = $1
	`, hash).Scan(&file.ID, &file.SignedByID, &file.Hash, &file.Timestamp, &file.Size, &file.MimeType)
	
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	return file, err
}

func (d *Database) FindFiles(skip, take int) ([]*File, error) {
	query := `SELECT id, signed_by_id, hash, timestamp, size, mime_type FROM files`
	if take > 0 {
		query += fmt.Sprintf(" LIMIT %d OFFSET %d", take, skip)
	}

	rows, err := d.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var files []*File
	for rows.Next() {
		file := &File{}
		if err := rows.Scan(&file.ID, &file.SignedByID, &file.Hash, &file.Timestamp, &file.Size, &file.MimeType); err != nil {
			return nil, err
		}
		files = append(files, file)
	}

	return files, rows.Err()
}

// Helper function to generate UUIDs
func generateUUID() string {
	return uuid.New().String()
}
