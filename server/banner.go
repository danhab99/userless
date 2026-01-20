package main

import (
	"bytes"
	"context"
	"database/sql"
	"fmt"
	"io"
	"log"
	"net/url"
	"os"
	"sync"
	"time"
	"userless/server/prisma/db"

	"github.com/gin-gonic/gin"
	"github.com/lib/pq"
	"github.com/pelletier/go-toml/v2"
)

type BannerCache struct {
	body   string
	mu     sync.RWMutex
	config Config
	banner []byte
	uc     *UserlessCtx
}

func (bc *BannerCache) updateBanner() {
	publicThreads, err := bc.uc.client.Thread.FindMany(
		db.Thread.ThreadPolicy.Where(
			db.ThreadPolicy.Advertise.Equals(true),
		),
	).Exec(context.Background())
	if err != nil {
		log.Printf("Error fetching public threads: %v", err)
		return
	}

	publicThreadRefs, err := bc.uc.client.ThreadRef.FindMany(
		db.ThreadRef.Advertise.Equals(true),
	).With(
		db.ThreadRef.Thread.Fetch(),
	).Exec(context.Background())
	if err != nil {
		log.Printf("Error fetching public thread refs: %v", err)
		return
	}

	pubThreadHashes := make([]string, len(publicThreads)+len(publicThreadRefs))
	for i, tm := range publicThreads {
		pubThreadHashes[i] = tm.Hash
	}
	for i, tm := range publicThreadRefs {
		pubThreadHashes[i+len(publicThreads)] = tm.Name
	}

	var u url.URL
	if bc.config.FileConfig.S3Config.SSL {
		u.Scheme = "https"
	} else {
		u.Scheme = "http"
	}
	u.Host = fmt.Sprintf("%s:%d", bc.config.FileConfig.S3Config.Host, bc.config.FileConfig.S3Config.Port)
	u.Path = bc.config.FileConfig.S3Config.Bucket

	var searchArgs []string
	if bc.config.SearchConfig.FullTextSearch {
		searchArgs = append(searchArgs, "body")
	}
	if bc.config.SearchConfig.EmailSearch {
		searchArgs = append(searchArgs, "email")
	}
	if bc.config.SearchConfig.KeyId {
		searchArgs = append(searchArgs, "keyId")
	}
	if bc.config.SearchConfig.RegexSearch {
		searchArgs = append(searchArgs, "regex")
	}

	info := map[string]any{
		"keys": map[string]any{
			"enabled":   bc.config.KeyConfig.Enable,
			"discovery": bc.config.KeyConfig.EnableDiscovery,
		},
		"threads": map[string]any{
			"enabled":   bc.config.ThreadsConfig.Enable,
			"discovery": bc.config.ThreadsConfig.EnableDiscovery,
			"frontpage": pubThreadHashes,
		},
		"files": map[string]any{
			"enabled":   bc.config.ThreadsConfig.Enable,
			"discovery": bc.config.ThreadsConfig.EnableDiscovery,
			"bucket":    u.String(),
		},
		"search": map[string]any{
			"threads": bc.config.SearchConfig.SearchThreads,
			"keys":    bc.config.SearchConfig.SearchKeys,
			"args":    searchArgs,
		},
	}

	tomlBuf := bytes.NewBuffer([]byte{})
	t := toml.NewEncoder(tomlBuf).SetArraysMultiline(true).SetIndentSymbol("\t").SetIndentTables(false)
	err = t.Encode(info)
	if err != nil {
		log.Printf("Error encoding TOML: %v", err)
		return
	}

	newBody := fmt.Sprintf("%s\n\n%s\n\n%s", tomlBuf.String(), DELIMITER, string(bc.banner))

	bc.mu.Lock()
	bc.body = newBody
	bc.mu.Unlock()

	log.Println("Banner updated successfully")
}

func (bc *BannerCache) getBanner() string {
	bc.mu.RLock()
	defer bc.mu.RUnlock()
	return bc.body
}

func (bc *BannerCache) listenForChanges() {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		log.Println("DATABASE_URL not set, cannot listen for changes")
		return
	}

	reportProblem := func(ev pq.ListenerEventType, err error) {
		if err != nil {
			log.Printf("Listener error: %v", err)
		}
	}

	listener := pq.NewListener(databaseURL, 10*time.Second, time.Minute, reportProblem)
	err := listener.Listen("banner_update")
	if err != nil {
		log.Printf("Error setting up listener: %v", err)
		return
	}

	log.Println("Listening for banner update notifications...")

	go func() {
		for {
			select {
			case notification := <-listener.Notify:
				if notification != nil {
					log.Printf("Received notification: %s", notification.Extra)
					bc.updateBanner()
				}
			case <-time.After(90 * time.Second):
				// Ping connection to keep it alive
				go func() {
					err := listener.Ping()
					if err != nil {
						log.Printf("Listener ping failed: %v", err)
					}
				}()
			}
		}
	}()
}

func setupDatabaseTriggers(databaseURL string) error {
	conn, err := sql.Open("postgres", databaseURL)
	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}
	defer conn.Close()

	// Create trigger function
	_, err = conn.Exec(`
		CREATE OR REPLACE FUNCTION notify_banner_update()
		RETURNS TRIGGER AS $$
		BEGIN
			PERFORM pg_notify('banner_update', 'change');
			IF TG_OP = 'DELETE' THEN
				RETURN OLD;
			ELSE
				RETURN NEW;
			END IF;
		END;
		$$ LANGUAGE plpgsql;
	`)
	if err != nil {
		return fmt.Errorf("failed to create trigger function: %w", err)
	}

	// Create trigger on ThreadPolicy table
	_, err = conn.Exec(`
		DROP TRIGGER IF EXISTS thread_policy_banner_update ON "ThreadPolicy";
		CREATE TRIGGER thread_policy_banner_update
		AFTER INSERT OR UPDATE OR DELETE ON "ThreadPolicy"
		FOR EACH ROW
		EXECUTE FUNCTION notify_banner_update();
	`)
	if err != nil {
		return fmt.Errorf("failed to create ThreadPolicy trigger: %w", err)
	}

	// Create trigger on ThreadRef table
	_, err = conn.Exec(`
		DROP TRIGGER IF EXISTS thread_ref_banner_update ON "ThreadRef";
		CREATE TRIGGER thread_ref_banner_update
		AFTER INSERT OR UPDATE OR DELETE ON "ThreadRef"
		FOR EACH ROW
		EXECUTE FUNCTION notify_banner_update();
	`)
	if err != nil {
		return fmt.Errorf("failed to create ThreadRef trigger: %w", err)
	}

	log.Println("Database triggers set up successfully")
	return nil
}

func banner(uc *UserlessCtx, config Config) func(ctx *gin.Context) {
	f, err := os.Open(config.BannerPath)
	if err != nil {
		panic(err)
	}

	bannerContent, err := io.ReadAll(f)
	if err != nil {
		panic(err)
	}

	bc := &BannerCache{
		config: config,
		banner: bannerContent,
		uc:     uc,
	}

	// Initialize banner content
	bc.updateBanner()

	// Setup database triggers
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL != "" {
		err = setupDatabaseTriggers(databaseURL)
		if err != nil {
			log.Printf("Warning: Failed to setup database triggers: %v", err)
			log.Println("Banner will not auto-update on database changes")
		} else {
			// Start listening for changes
			bc.listenForChanges()
		}
	} else {
		log.Println("Warning: DATABASE_URL not set, banner will not auto-update")
	}

	return func(ctx *gin.Context) {
		defer ctx.Done()
		ctx.String(200, bc.getBanner())
	}
}
