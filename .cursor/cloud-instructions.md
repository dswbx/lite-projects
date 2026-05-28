# Cursor Cloud specific instructions

See [`AGENTS.md`](../AGENTS.md) for general repo instructions and codebase gotchas.

## Environment

The update script installs [Bun](https://bun.sh) and adds it to `$PATH`. It does not install per-project deps (each slug directory manages its own).

If `bun` is not found in a new shell, run `export PATH="$HOME/.bun/bin:$PATH"` or `source ~/.bashrc`.

## Running a project

Refer to the "Cloud / CI agent notes" section in `AGENTS.md` for the standard `bun install` / `bun run dev` workflow. Nothing additional is required for Cursor Cloud beyond what is documented there.
