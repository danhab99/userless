
build image dir:
  docker build --file ./docker/Dockerfile.{{image}} --build-arg APP_DIR={{dir}} --tag {{dir}} .
