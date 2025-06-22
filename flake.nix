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
        devShells = {
          go = pkgs.mkShell {
            packages = with pkgs; [
              gnumake
              go
              gopls
            ];

            GO_PATH="${self.outPath}/.go";

            shellHook = ''
            zsh
            '';
          };

          ts = pkgs.mkShell {
            packages = with pkgs; [
              gnumake
              yarn
              nodejs_22
            ];

            shellHook = ''
            zsh
            '';
          };
        };
      });
}
