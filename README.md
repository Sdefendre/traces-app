# Traces

A desktop knowledge management app with a 3D galaxy-themed knowledge graph, markdown editor, and agentic AI assistant. Built with Electron + Next.js.

## Features

- **3D Galaxy Knowledge Graph** — Interactive force-directed graph in a starfield/outer space environment. Color-coded nodes with bloom glow effects. Settings panel for node size, labels, line thickness, color, and rotation.
- **Agentic AI Chat** — AI models can read, write, edit, search, and delete files in your vault using tool calls. Supports Ollama (local), OpenAI, Anthropic Claude (Opus 4.6, Sonnet 4.6), xAI Grok.
- **Dark Mode** — Pure black dark mode inspired by grok.com. Sharp black/white shadcn/ui-inspired design.
- **Liquid Glass UI** — Frosted glass panels with backdrop blur effects
- **Markdown Editor** — Full CodeMirror 6 editor with wiki-link support (`[[note name]]`), auto-save, and syntax highlighting.
- **File Management** — Sidebar with search, create, delete, and folder navigation. Open any folder as a vault.
- **Resizable Panels** — Drag to resize sidebar, editor, and chat panels

## Tech Stack

- Electron + Next.js 15
- React Three Fiber (R3F v9) + Three.js
- d3-force-3d
- CodeMirror 6
- Zustand
- Tailwind CSS v4
- TypeScript

## Getting Started

```bash
# Install dependencies
pnpm install

# Install Electron binary (if needed)
node node_modules/.pnpm/electron@*/node_modules/electron/install.js

# Start development
pnpm dev
```

## API Keys

Add API keys to `.env.local`:
```
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
XAI_API_KEY=xai-...
```

Ollama runs locally and needs no API key. Install from https://ollama.ai.

## Project Structure

```
traces/
├── main/              # Electron main process
│   ├── index.ts       # Window creation, IPC handlers
│   ├── preload.ts     # Context bridge API
│   └── ipc/           # File system, vault parser, watcher
├── src/
│   ├── app/           # Next.js app router
│   │   ├── api/chat/  # Agentic AI API route
│   │   └── globals.css
│   ├── components/
│   │   ├── graph/     # 3D galaxy knowledge graph (R3F)
│   │   ├── editor/    # CodeMirror markdown editor
│   │   ├── sidebar/   # File tree
│   │   ├── chat/      # AI chat panel
│   │   └── layout/    # AppShell
│   ├── stores/        # Zustand stores
│   ├── lib/           # Electron API wrapper
│   └── types/         # TypeScript types
├── scripts/           # Dev scripts
└── package.json
```

## License

MIT
