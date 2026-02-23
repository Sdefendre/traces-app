# Traces

A desktop knowledge management app with a 3D force-directed knowledge graph, markdown editor, and multi-provider AI assistant. Built with Electron, Next.js 15, and React Three Fiber.

---

## Overview

Traces is a local-first note-taking and knowledge management tool designed for exploring connections between ideas. Notes are stored as markdown files in a vault directory on your machine. A real-time 3D graph visualizes how notes link to each other through wiki-links, while an integrated AI assistant can read, write, and edit files directly in your vault.

The interface is built around four collapsible panels -- Files, Graph, Notes, and Chat -- that can each be independently toggled and resized to fit your workflow.

---

## Features

### 3D Knowledge Graph

Interactive force-directed graph visualization of notes and their connections, rendered with React Three Fiber and Three.js. Nodes represent notes and edges represent wiki-links between them. Background starfield with bloom post-processing.

### Markdown Editor

CodeMirror 6-based editor with wiki-link support (`[[note name]]`) for navigating between notes. Features syntax highlighting, auto-save, light and dark themes, and wiki-link autocomplete.

### Markdown Preview

Toggle between edit mode and a rendered preview of the current note. The preview supports headings, bold, italic, inline code, fenced code blocks, bullet lists, and clickable wiki-links. Switch modes with the Preview/Edit button in the editor toolbar.

### Note Title Sync

Changing the `# Title` heading in a note automatically renames the underlying file after a 1.5-second debounce. The file tree, active tab, and editor breadcrumb all update to reflect the new name without manual intervention.

### Word Count Status Bar

The bottom of the editor displays a persistent status bar showing word count, character count, estimated reading time, and line count for the current note.

### Open Chat from Notes

A MessageCircle button in the editor header opens the AI chat panel directly from the notes view, making it easy to invoke the AI assistant while writing. The button appears when the chat panel is closed.

### Full Settings Page

Full-screen settings overlay accessed via the gear icon (bottom-left) or closed with Escape. Sidebar navigation with four sections:

- **AI & Models** -- API key management for Anthropic, OpenAI, Google, and xAI. Ollama endpoint configuration. Per-provider model enable/disable checkboxes to control which models appear in the chat picker. Default provider and model selection. Custom system prompt.
- **Editor** -- font size slider, light/dark mode toggle, spell check.
- **Graph** -- node size, show labels, line thickness, auto-rotate, rotate speed, and line color.
- **General** -- vault path display, startup behavior, clear chat on close.

Settings persist across app restarts via Electron IPC (`settings.json` in user data directory).

### AI Chat (TracesAI)

Multi-provider chat panel supporting:

- **Ollama** -- local models, no API key required
- **Anthropic Claude**
- **OpenAI GPT**
- **Google Gemini**
- **xAI Grok**

The assistant has model identity awareness and access to file tools (read, write, edit, search, delete) for working directly with vault files through tool calls.

### File Tree Sidebar

Hierarchical file browser with search, context menus, and new note/folder creation. Open any folder on your system as a vault.

### Collapsible Panel Layout

Four panels (Files, Graph, Notes, Chat) can be independently collapsed to a vertical tab strip on the left side of the window. Dynamic resizing fills available space when panels are collapsed.

### Draggable Panel Dividers

All panel borders -- sidebar-to-graph, graph-to-editor, and editor-to-chat -- are draggable dividers that allow resizing panels by click-and-drag. Dividers highlight on hover and during drag for clear visual feedback.

### Glass UI

Frosted glass panels with backdrop blur, built on shadcn/ui with custom glass and gradient button variants.

---

## Tech Stack

| Category | Technology |
| --- | --- |
| Framework | Next.js 15 (App Router) |
| UI Library | React 19 |
| Desktop Runtime | Electron 34 |
| Language | TypeScript |
| Styling | Tailwind CSS v4, tw-animate-css |
| Components | shadcn/ui (New York style, CVA variants) |
| State Management | Zustand |
| Editor | CodeMirror 6 |
| 3D Rendering | React Three Fiber, Three.js, @react-three/drei, @react-three/postprocessing |
| Graph Physics | D3 Force 3D |
| Icons | Lucide React |
| Package Manager | pnpm |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [pnpm](https://pnpm.io/)
- [Ollama](https://ollama.ai/) (optional, for local AI models)

### Installation

```bash
pnpm install
```

### Development

```bash
pnpm dev
```

### Build

```bash
pnpm build
pnpm start
```

### API Keys

API keys can be configured directly in the app via **Settings > AI & Models**. Alternatively, create a `.env.local` file in the project root:

```
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AIza...
XAI_API_KEY=xai-...
```

Ollama runs locally and requires no API key.

---

## Keyboard Shortcuts

| Shortcut | Action |
| --- | --- |
| `Cmd + 1` | Toggle Files panel |
| `Cmd + 2` | Toggle Graph panel |
| `Cmd + 3` | Toggle Notes panel |
| `Cmd + 4` | Toggle Chat panel |
| `Cmd + N` | New note |
| `Cmd + F` | Search |
| `Cmd + \` | Fullscreen graph |

---

## Project Structure

```
traces-app/
├── main/                          # Electron main process
│   ├── index.ts                   # Window creation, IPC handlers
│   ├── preload.ts                 # Context bridge API
│   └── ipc/
│       ├── handlers.ts            # IPC handler registration
│       ├── file-system.ts         # File system operations
│       ├── vault-parser.ts        # Vault parsing and graph data
│       └── vault-watcher.ts       # File watching with chokidar
├── src/
│   ├── app/
│   │   ├── api/chat/              # Multi-provider AI chat route
│   │   ├── layout.tsx             # Root layout
│   │   ├── page.tsx               # Entry page
│   │   └── globals.css            # Tailwind v4 + shadcn tokens
│   ├── components/
│   │   ├── ui/                    # shadcn/ui primitives
│   │   │   ├── button.tsx
│   │   │   ├── collapsible.tsx
│   │   │   ├── context-menu.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── popover.tsx
│   │   │   ├── switch.tsx
│   │   │   └── tooltip.tsx
│   │   ├── graph/                 # 3D knowledge graph
│   │   │   ├── KnowledgeGraph.tsx
│   │   │   ├── GraphScene.tsx
│   │   │   ├── GraphSettings.tsx
│   │   │   ├── NeuralNode.tsx
│   │   │   ├── Synapse.tsx
│   │   │   ├── BackgroundField.tsx
│   │   │   └── useForceGraph.ts
│   │   ├── editor/                # Markdown editor
│   │   │   ├── EditorPanel.tsx
│   │   │   ├── MarkdownEditor.tsx
│   │   │   ├── MarkdownPreview.tsx
│   │   │   └── extensions/
│   │   ├── sidebar/               # File tree browser
│   │   │   ├── FileTree.tsx
│   │   │   └── FileTreeItem.tsx
│   │   ├── chat/                  # AI chat panel
│   │   │   └── ChatPanel.tsx
│   │   ├── settings/              # Settings panel
│   │   │   └── SettingsPanel.tsx
│   │   └── layout/                # Panel orchestration
│   │       └── AppShell.tsx
│   ├── stores/                    # Zustand state
│   │   ├── vault-store.ts
│   │   ├── editor-store.ts
│   │   ├── graph-store.ts
│   │   ├── settings-store.ts      # App settings (AI, editor, general)
│   │   └── ui-store.ts
│   ├── lib/
│   │   ├── electron-api.ts        # Electron API wrapper
│   │   └── utils.ts               # cn() utility
│   └── types/                     # TypeScript type definitions
├── scripts/
│   └── dev.mjs                    # Development script
├── components.json                # shadcn/ui config
├── package.json
└── tsconfig.json
```

---

## License

MIT
