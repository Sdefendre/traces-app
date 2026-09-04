# Changelog

All notable changes to **Traces** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Traces is a product of **Defendre Solutions LLC**.

## [Unreleased]

### Fixed
- Preview wiki-links with aliases (`[[Note|label]]`) now show the label and open the note, matching the editor and graph.
- Wiki-links that match several notes now fill Files search with that name so you can pick. They no longer open a guessed note or create a duplicate.
- Settings now save. New notes no longer always land in Memory.
- The graph camera resets when you switch views, so nodes stay in frame.
- GitHub Pages deploy fails clearly when the repo is not set to GitHub Actions.

### Added
- GitHub Actions CI (`.github/workflows/ci.yml`) runs lint, typecheck, unit tests, and build on push and pull request.
- ESLint and unit tests: `pnpm lint`, `pnpm typecheck`, `pnpm test`.
- WebMCP tools on the GitHub Pages site via `document.modelContext || navigator.modelContext` (26 August 2026 draft), then `registerTool`. Marketing tools include `get-contact` for the public footer email. The desktop renderer uses the same feature-detect for `search-notes` and `open-note`.
- Particle View with five deterministic shapes, smooth node-ID-preserving morphs, file-size-based points, hover details, click-to-open selection, fullscreen controls, and low-power rendering.
- Bring-your-own agent sign-in for Codex, Grok CLI, and Claude in Settings > AI & Models. Chat uses the CLI account on the machine and fails closed if that CLI is missing or logged out.
- MIT license and Defendre Solutions LLC branding (LICENSE, package.json author/homepage/repository).
- `electron-builder` publish config targeting GitHub Releases (macOS dmg/zip, Windows nsis, Linux AppImage/deb).
- GitHub Actions release pipeline (`.github/workflows/release.yml`) that builds and publishes installers on `v*` tags.

### Changed
- CI uses Node 22. GitHub Actions are on current majors (`actions/checkout@v7`, `actions/setup-node@v7`, `pnpm/action-setup@v6`).

## [0.2.0] - 2026-07-17

### Added
- Packaging and branding so Traces can ship as a Defendre Solutions app.
- Bumped the version from 0.1.0 to 0.2.0.

## [0.1.0]

### Added
- Local-first note-taking with markdown files stored in a vault directory.
- 3D force-directed knowledge graph (React Three Fiber) of wiki-link connections.
- CodeMirror 6 markdown editor with wiki-link autocomplete, auto-save, and light/dark themes.
- Multi-provider AI assistant (TracesAI): Ollama, Anthropic, OpenAI, Google, xAI, with file read/write/edit tools.
- Four-panel collapsible layout (Files, Graph, Notes, Chat) with draggable dividers.
- Settings page (AI & Models, Editor, Graph, General) persisted via Electron IPC.
- Stability and performance fixes: tab-close policy, warm cache, incremental vault watcher.
