ifneq ("$(wildcard .env)","")
  include .env
  export
endif

run:
	go run . -config-path ./example_configs/basic.toml

debug:
	dlv debug . -- -config-path ./example_configs/basic.toml
