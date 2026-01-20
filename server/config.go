package main

type Config struct {
	BannerPath string `toml:"banner"`
	Port       int    `toml:"port"`
	Host       string `toml:"host"`

	Database      DatabaseConfig `toml:"database"`
	KeyConfig     KeyConfig      `toml:"public_keys"`
	ThreadsConfig ThreadConfig   `toml:"threads"`
	FileConfig    FileConfig     `toml:"files"`
	SearchConfig  SearchConfig   `toml:"search"`
}

type SecurityConfigMode string

const BasicMode SecurityConfigMode = "basic"
const ShellMode SecurityConfigMode = "shell"
const HttpMode SecurityConfigMode = "webhook"

type KeyConfig struct {
	Enable          bool               `toml:"enable"`
	Mode            SecurityConfigMode `toml:"mode"`
	EnableDiscovery bool               `toml:"enable_discovery"`
	EnableRegister  bool               `toml:"enable_register"`

	AllowedToPost        bool `toml:"allowed_to_post"`
	CanStartThreads      bool `toml:"can_start_threads"`
	AllowedToUploadFiles bool `toml:"allowed_to_upload_files"`
	MaxFileSize          bool `toml:"max_file_size"`

	ExecOnNewKey string `toml:"on_new_key"`

	WebHookUrl string `toml:"webhook_url"`
}

type ThreadConfig struct {
	Enable          bool               `toml:"enable"`
	Mode            SecurityConfigMode `toml:"mode"`
	EnableDiscovery bool               `toml:"enable_discovery"`
	EnablePost      bool               `toml:"enable_post"`

	Visible          bool `toml:"visible_by_default"`
	AllowReplies     bool `toml:"allow_replies"`
	CanEditOwnPolicy bool `toml:"can_edit_own_policy"`

	ExecOnNewThread string `toml:"on_new_thread"`

	WebHookUrl string `toml:"webhook_url"`
}

type FileConfig struct {
	Enable          bool               `toml:"enable"`
	Mode            SecurityConfigMode `toml:"mode"`
	EnableDiscovery bool               `toml:"enable_discovery"`
	EnableUpload    bool               `toml:"enable_upload"`

	ExecOnNewFile string `toml:"on_new_thread"`

	WebHookUrl string `toml:"webhook_url"`

	S3Config S3Config `toml:"s3"`
}

type S3Config struct {
	Host   string `toml:"host"`
	Port   int    `toml:"port"`
	SSL    bool   `toml:"ssl"`
	Bucket string `toml:"bucket"`
}

type SearchConfig struct {
	FullTextSearch bool `toml:"full_text_search"`
	EmailSearch    bool `toml:"email"`
	KeyId          bool `toml:"key_id"`
	SearchThreads  bool `toml:"search_threads"`
	SearchKeys     bool `toml:"search_keys"`
	RegexSearch    bool `toml:"regex"`
}

type DatabaseConfig struct {
	Driver string `toml:"driver"` // "sqlite" or "postgres"
	DSN    string `toml:"dsn"`    // Data source name/connection string
}
