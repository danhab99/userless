.DEFAULT_GOAL := run

ifneq ("$(wildcard .env)","")
  include .env
  export
endif

server:
	cd server && go run .

threads:
	cd threads && yarn install
