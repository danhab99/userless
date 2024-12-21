package main

type Config struct {
	BannerPath string `toml:"banner"`
	Port       int    `toml:"port"`
	Host       string `toml:"host"`

	KeyConfig     KeyConfig    `toml:"public_keys"`
	ThreadsConfig ThreadConfig `toml:"threads"`
	FileConfig    FileConfig   `toml:"files"`
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
}
