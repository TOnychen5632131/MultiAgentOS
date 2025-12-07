# Repository Guidelines

## Project Structure & Module Organization
- Pnpm/Turbo monorepo. Desktop app lives in `apps/ui-tars` (Electron main, preload, renderer, assets, e2e). Reusable code is in `packages/ui-tars` (SDK, operators, CLI, IPC, shared, utio, visualizer) and `packages/agent-infra` (browser automation, MCP servers/clients, search, logging). Tooling/config is in `packages/common`; supporting material sits in `docs/`, `examples/`, `rfcs/`, `infra/`, and `scripts/`.

## Build, Test, and Development Commands
- `pnpm bootstrap` (Node 20+, pnpm 9+): install workspace deps.
- `pnpm dev:ui-tars` or `pnpm --filter ui-tars-desktop dev:w`: run the desktop app; `dev:w` also reloads the main process and accepts `-- --remote-debugging-port=9222`.
- `pnpm --filter ui-tars-desktop build` (or `... package`): create production artifacts in `apps/ui-tars/out`/`dist`.
- `pnpm lint` / `pnpm format`: ESLint (Electron Toolkit presets) and Prettier.
- `pnpm test` / `pnpm coverage`: Vitest + Istanbul coverage to `coverage/`.
- `pnpm --filter ui-tars-desktop test:e2e`: Playwright E2E; builds automatically via `build:e2e`.

## Coding Style & Naming Conventions
- TypeScript/React with 2-space indent, single quotes, semicolons, trailing commas (see `.prettierrc.mjs`, `.editorconfig`).
- PascalCase React components, `useX` hooks, camelCase variables/functions; SCREAMING_SNAKE env keys.
- Use workspace scopes for imports (`@ui-tars/*`, `@agent-infra/*`, `@common/*`). Centralize shared types/configs in `packages/ui-tars/shared` or `packages/common`.

## Testing Guidelines
- Unit specs as `*.test.ts(x)` next to code. Coverage targets `apps/**` and `packages/**` except visualizer/templates; keep CI green.
- Playwright suites in `apps/ui-tars/e2e`; run after build and grant OS automation rights on macOS.
- Add unit coverage for logic and minimal E2E for user-visible flows; prefer deterministic fixtures.

## Commit & Pull Request Guidelines
- Conventional Commits enforced by commitlint; types: feat, fix, docs, chore, refactor, ci, test, perf, style, tweak, release, revert (scope optional).
- PRs should note scope, linked issue, tests run, and UI screenshots/recordings when visuals change. Update docs when behavior or config changes.
- Run `pnpm lint && pnpm test` (plus Playwright when relevant) before pushing; keep changes scoped to one concern.

## Security & Configuration Notes
- Base env values on `.env.example`; do not commit secrets. Secretlint runs on staged files.
- Browser/remote operators may need OS permissions; call them out in PRs with reproduction steps.
