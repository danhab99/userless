ifneq ("$(wildcard .env)","")
  include .env
  export
endif

format:
	go run github.com/steebchen/prisma-client-go format

generate: format
	go run github.com/steebchen/prisma-client-go generate

db: generate
	go run github.com/steebchen/prisma-client-go db push

run:
	go run . -config-path ./example_configs/basic.toml

debug:
	dlv debug . -- -config-path ./example_configs/basic.toml
