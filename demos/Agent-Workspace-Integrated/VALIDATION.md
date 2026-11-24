# Validation — 2026-11-24

Environment: Linux, Node v24.22.3, pnpm 10.34.9.

- pnpm install --frozen-lockfile --ignore-scripts: passed with unchanged frontend lockfile.
- npm --prefix agent-runtime ci: passed.
- npm run build (root): passed; TypeScript + Vite production bundle.
- npm test (root): 13 files, 292 tests passed.
- npm run check (agent-runtime): passed.
- npm test (agent-runtime): 267 tests passed, including 3 new desktop adapter tests.
- Spawned desktop-cli.ts with real JSON stdin/stdout, demo plan then separate run: passed; draft -> completed and saved files confirmed.
- UI tests cover explicit run click, required input gating, plan invalidation, browser preview error and IPC failure recovery.
- Runtime tests cover persistence, request overwrite rejection, traversal rejection, clarification rejection and missing required source data.

Not verified: Rust/Cargo compile (toolchain unavailable in this execution environment), Windows Tauri window/IPC end-to-end, real FactChat/API credentials and model behavior, packaged desktop installer.

This is a development source integration, not a verified Windows release. Runtime bridge is one process per operation; it does not yet implement the product's persistent sidecar lifecycle or streaming/cancel UI.
