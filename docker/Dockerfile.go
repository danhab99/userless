# syntax=docker/dockerfile:1
ARG APP_DIR=centralized/server

FROM golang:1.25-alpine AS builder
RUN apk add --no-cache git ca-certificates
WORKDIR /src

ARG APP_DIR
COPY ${APP_DIR}/go.mod ${APP_DIR}/go.sum ./
RUN go mod download

COPY ${APP_DIR} ./${APP_DIR}
WORKDIR /src/${APP_DIR}
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w" -o /outbin ./...

FROM scratch
ARG BINARY_NAME
COPY --from=builder /outbin /outbin
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt
EXPOSE 4444
ENTRYPOINT ["/outbin"]
