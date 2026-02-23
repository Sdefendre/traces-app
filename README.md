# Traces

A desktop knowledge management app built with Electron + Next.js. Features a 3D knowledge graph, markdown editor, and agentic AI assistant.

## Features

- **3D Knowledge Graph** — Interactive force-directed graph visualization of your notes using React Three Fiber. Nodes are color-coded by category. Click to open, hover to highlight connections.
- **Markdown Editor** — Full CodeMirror 6 editor with wiki-link support (`[[note name]]`), auto-save, and syntax highlighting.
- **Agentic AI Chat** — Chat with AI models that can read, write, edit, search, and delete files in your vault. Supports:
  - Ollama (local models, auto-detected)
  - OpenAI (GPT-4o, GPT-4o-mini)
  - Anthropic Claude (Opus 4.6, Sonnet 4.6, Sonnet 4, Haiku 4.5)
  - xAI Grok (Grok 3 Fast)
- **File Management** — Sidebar with search, create, delete, and folder navigation. Open any folder as a vault.
- **Dark Mode** — Full dark/light theme toggle
- **Resizable Panels** — Drag to resize sidebar, editor, and chat panels
- **Graph Settings** — Control node size, labels, line thickness, rotation

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
traces-app/
├── main/              # Electron main process
│   ├── index.ts       # Window creation, IPC handlers
│   ├── preload.ts     # Context bridge API
│   └── ipc/           # File system, vault parser, watcher
├── src/
│   ├── app/           # Next.js app router
│   │   ├── api/chat/  # Agentic AI API route
│   │   └── globals.css
│   ├── components/
│   │   ├── graph/     # 3D knowledge graph (R3F)
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
