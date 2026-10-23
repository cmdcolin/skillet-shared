# skillet-shared

Code that bender and videoskillet both ship, as raw TypeScript and CSS.

- **In:** nothing at build time; each app compiles the source itself
- **Out:** modules under `skillet-shared/<name>`, listed in `exports`

Both apps run it through Vite, so imports keep their `.ts` form and need no build step.

## Develop

- `pnpm test` and `pnpm typecheck` run the package's own suite
- In an app, `pnpm link ../skillet-shared` tests an edit before it is tagged
- Release: bump `version`, tag it, `npm publish`, then bump the range in each app
