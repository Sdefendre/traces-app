# Changelog

All notable changes to **Traces** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Traces is a product of **Defendre Solutions LLC**.

## [Unreleased]

### Added
- MIT license and Defendre Solutions LLC branding (LICENSE, package.json author/homepage/repository).
- `electron-builder` publish config targeting GitHub Releases (macOS dmg/zip, Windows nsis, Linux AppImage/deb).
- GitHub Actions release pipeline (`.github/workflows/release.yml`) that builds and publishes installers on `v*` tags.

## [0.2.0] - 2026-07-17

### Added
- Productized packaging foundation for distribution as a Defendre Solutions product.
- Version bumped from 0.1.0 to 0.2.0 to mark the start of the product line.

## [0.1.0]

### Added
- Local-first note-taking with markdown files stored in a vault directory.
- 3D force-directed knowledge graph (React Three Fiber) visualizing wiki-link connections.
- CodeMirror 6 markdown editor with wiki-link autocomplete, auto-save, and light/dark themes.
- Multi-provider AI assistant (TracesAI): Ollama, Anthropic, OpenAI, Google, xAI, with file read/write/edit tools.
- Four-panel collapsible layout (Files, Graph, Notes, Chat) with draggable dividers.
- Settings page (AI & Models, Editor, Graph, General) persisted via Electron IPC.
- Stability and performance fixes: tab-close policy, warm cache, incremental vault watcher.
