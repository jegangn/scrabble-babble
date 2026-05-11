# Build & Scripts

## Toolchain

- Node 20+ (or Bun 1.1+)
- bun (package manager)
- Windows 11, no WSL

## Scripts

```bash
bun install                    # install deps
bun run typecheck              # tsc --noEmit, zero errors required
bun test                       # vitest run
bun run test:watch             # vitest watch mode
bun run coverage               # vitest run --coverage (v8); fails below thresholds
bun run lint:engine-purity     # verifies src/engine/ has no UI/DOM/storage/net imports
```

Phase 1+ will add:

```bash
bun run dev                    # vite dev server
bun run build                  # vite build → dist/ (static)
bun run preview                # serve dist/ locally
```

## Cross-platform Notes

- No `&&` chains in `package.json` scripts. Chain via separate scripts or `npm-run-all` when needed.
- Path separators: use `path.join` in scripts, never hardcode `/` or `\`.
- Project is ESM (`"type": "module"`). Vitest config uses `import`.
- Bun installed via `npm install -g bun` if missing; binary lives in the npm global prefix on Windows.

## CI Expectations (future)

When CI is added in Phase 1, the gate is: typecheck + test + coverage + engine-purity, all green.
