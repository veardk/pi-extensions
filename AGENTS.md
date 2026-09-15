# pi-extensions monorepo

Personal collection of pi extensions. Each plugin lives in
`packages/pi-<name>/` as an independently-published npm package.

## Layout

```
packages/      plugins — one directory = one npm package
AGENTS.md      this file
biome.json     format + lint (monorepo-wide)
tsconfig.json  TypeScript root config (no per-package tsconfig)
```

## Commands

| Purpose | Command | Where |
|---|---|---|
| Typecheck (whole monorepo) | `npx tsc --noEmit` | repo root |
| Format | `npx biome format --write` | repo root |
| Tests for one package | `node --test packages/<pkg>/src/*.test.ts` | repo root |

Tests use `node:test` + `node:assert` — no bun, vitest, or tsx.

## Adding a new package

1. `mkdir -p packages/pi-<name>/src`
2. Copy `package.json` from `packages/pi-name-format/package.json`, rename
   `name` / `description` / `repository`, list new peerDependencies
3. Write `src/index.ts` (default-exports the extension factory), `types.ts`,
   `config.ts`, and any logic modules, plus `*.test.ts` files
4. Write `README.md` in English — must include `## Installation` and
   `## Dependencies` sections

Cross-workspace deps use `"*"`; npm workspaces resolves locally.
Never `workspace:*` (unsupported) or `^x.y.z` (lockfile churn).

## Commit convention

Conventional Commits, package scope:

```
<type>(pi-<pkg>): <description>
```

Types: `feat` | `fix` | `chore` | `docs` | `refactor` | `style` | `test`.
Append `!` for breaking changes. Push to `main` triggers CI publish via
GitHub Actions (semver by type).

**Do not auto-commit.** Show the diff and wait for the user to confirm.

