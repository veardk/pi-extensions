# pi-extensions

Personal monorepo of pi extensions. Each package in
[`packages/`](./packages) is an independently-published npm plugin
for [pi](https://github.com/badlogic/pi-mono) (`@earendil-works/pi-coding-agent`).

## Packages

| Package | Description |
|---|---|
| [`@veardk/pi-session-name-format`](./packages/pi-session-name-format) | Session naming with a free-form format template and per-language output |

## Conventions

See [AGENTS.md](./AGENTS.md) for layout, commit conventions, content
language rules, and the recipe for adding a new package.

## Development

```bash
npx tsc --noEmit                       # typecheck the whole monorepo
npx biome format --write               # format everything
node --test packages/<pkg>/src/*.test.ts  # run one package's tests
```

## License

[MIT](./LICENSE)