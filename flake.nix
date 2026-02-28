{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachSystem flake-utils.lib.defaultSystems (system:
      let
        pkgs = import nixpkgs {
          inherit system;
          config.allowUnfree = true;
        };
        lib = pkgs.lib;

      in {
        packages = {
          server = pkgs.buildGoModule {
            pname = "userless-server";
            version = "1.0";

            src = ./server;
            vendorHash = "sha256-pe+h/8kdh8zbV1yrvATwk1APjnA05qa7bpGhOpgicsA=";
          };
        };

        devShells = {
          go = pkgs.mkShell {
            packages = with pkgs; [
              gnumake
              go
              gopls
            ];

            GO_PATH="${self.outPath}/.go";
          };

          ts = pkgs.mkShell {
            packages = with pkgs; [
              gnumake
              yarn
              nodejs_22
            ];
          };
        };
      });
}
