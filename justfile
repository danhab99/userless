
run shell dir command:
  nix develop .#{{shell}} --command bash -c "cd {{dir}} && {{command}}"

run-server:
  just run go server "go run . --config-path example_configs/basic.toml"

run-node dir:
  just run ts {{dir}} "yarn dev"

run-threads:
  just run-node threads

run-redditless:
  just run-node redditless
