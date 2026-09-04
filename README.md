# Traces

Marketing site: https://sdefendre.github.io/traces-app/

A Defendre Solutions product. Markdown notes on disk, a 3D wiki-link graph, and a multi-provider AI assistant that can edit those files. Electron, Next.js 15, React Three Fiber. No hosted vault.

## Notes, graph, chat

Notes are `.md` files in a folder you pick. Wiki-links (`[[note name]]`) become edges in a live 3D graph. Chat can read and write the same files.

Four panels: Files, Graph, Notes, Chat. Collapse or resize any of them. That is the whole layout.

## Graph

React Three Fiber and Three.js. Galaxy, Terrain, Cluster, and Particle views share one starfield and one camera.

Particle View puts one point per note on five fixed surfaces: Möbius Strip, Toroidal Vortex, Spherical Harmonics, Lissajous Curve, and Fractal Branches. Switching shapes morphs the points that still exist. Color is category. Size is markdown length. Hover for details. Click a point to open that note. Low Power Mode keeps the layout and drops edge attraction, bloom, and the dense background.

## Editor

CodeMirror 6 with wiki-links, autocomplete, auto-save, and light or dark themes.

Preview renders headings, bold, italic, inline code, fenced blocks, bullets, and clickable wiki-links, including aliases (`[[Note|label]]`). Use the Preview/Edit button in the toolbar.

Click a wiki-link to open that note. If several notes share the name, Files search filters to those notes so you can pick one. It does not guess or create a duplicate.

Change the `# Title` heading and the file renames after 1.5 seconds. The file tree, tab, and breadcrumb follow.

The status bar under the editor shows word count, character count, reading time, and line count.

The MessageCircle button in the editor header opens Chat when that panel is closed.

## Settings

Gear icon, bottom left. Escape closes it.

- **AI & Models.** Sign in with Codex, Grok CLI, or Claude. API keys for Anthropic, OpenAI, Google, and xAI. Ollama endpoint. Checkboxes for which models show in the chat picker. Default provider and model. Custom system prompt. Voice provider (OpenAI or Grok), voice name, and auto-play.
- **Editor.** Font size, light or dark, spell check.
- **Graph.** Node size, labels, line thickness, auto-rotate, rotate speed, line color, low-power rendering.
- **General.** Vault path, startup behavior, clear chat on close.

Settings write to `settings.json` in the Electron user data directory.

## Chat

TracesAI talks to the provider you pick.

- **Codex, Grok CLI, and Claude.** Sign in with the account already on your machine.
- **Ollama.** Local models. No API key.
- **Anthropic, OpenAI, Google, xAI.** API key.

The assistant knows which model it is. API-key providers get file tools (read, write, edit, search, delete). Signed-in CLIs run in the vault and can edit notes there.

The mic in Chat starts a voice session. OpenAI Realtime needs an OpenAI key. Grok needs an xAI key. Switch GPT/Grok next to the mic. Settings > AI & Models picks the voice and whether replies auto-play.

If a bring-your-own CLI is missing or logged out, Traces stops and tells you. It does not fall back to another provider or an API key. I would rather fail closed than silently switch you.

## Files and layout

File tree with search, context menus, and new note or folder. Open any folder as a vault.

Collapse a panel and it becomes a tab on the left. Drag the borders between Files, Graph, Notes, and Chat to resize. Hover or drag lights the divider.

Panels use frosted glass on shadcn/ui, with glass and gradient button variants.

## Tech stack

| Category | Technology |
| --- | --- |
| Framework | Next.js 15 (App Router) |
| UI library | React 19 |
| Desktop runtime | Electron 34 |
| Language | TypeScript |
| Styling | Tailwind CSS v4, tw-animate-css |
| Components | shadcn/ui (New York style, CVA variants) |
| State management | Zustand |
| Editor | CodeMirror 6 |
| 3D rendering | React Three Fiber, Three.js, @react-three/drei, @react-three/postprocessing |
| Graph physics | D3 Force 3D |
| Icons | Lucide React |
| Package manager | pnpm |

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) 22 (CI uses 22; 18+ may still run)
- [pnpm](https://pnpm.io/) 10
- [Ollama](https://ollama.ai/) (optional, for local models)
- Codex CLI, Grok CLI, or Claude Code (optional, to sign in with your own agent account)

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

### Lint, typecheck, tests

```bash
pnpm lint
pnpm typecheck
pnpm test
```

`pnpm test` runs the unit scripts under `scripts/verify-*.ts` (editor store, wiki-links, note stats, API errors, BYO agents, particle layout, WebMCP). GitHub Actions runs the same lint, typecheck, tests, and build on every push and pull request.

### Sign in with Codex, Grok CLI, or Claude

Traces does not ship API keys or store CLI tokens. You sign in with the CLI already installed on your computer.

1. Install the CLI you want:
   - Codex: [OpenAI Codex CLI](https://developers.openai.com/codex/cli)
   - Grok CLI: [xAI Grok CLI](https://docs.x.ai/build/cli/reference)
   - Claude: [Claude Code](https://code.claude.com/docs/en/authentication)
2. Open **Settings > AI & Models**.
3. Under **Bring your own agent**, click **Sign in** (or run `codex login`, `grok login`, or `claude auth login` in a terminal).
4. Click **Recheck**. The row should say Signed in.
5. In Chat, pick Codex, Grok CLI, or Claude from **Bring your own agent**.

If the CLI is missing, the login expired, or the command fails, chat stops for that agent. Traces will not silently use an API key instead.

API-key providers still work the same way as before.

### API keys

API keys go in **Settings > AI & Models**. Or create a `.env.local` file in the project root:

```
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_API_KEY=
XAI_API_KEY=
```

Those keys are only for the Anthropic / OpenAI / Google / xAI API-key providers. They are not used for Codex, Grok CLI, or Claude sign-in. Ollama runs locally and needs no API key.

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Cmd + 1` | Toggle Files panel |
| `Cmd + 2` | Toggle Graph panel |
| `Cmd + 3` | Toggle Notes panel |
| `Cmd + 4` | Toggle Chat panel |
| `Cmd + N` | New note |
| `Cmd + F` | Search |
| `Cmd + \` | Fullscreen graph |

## Project structure

```
traces-app/
├── main/                          # Electron main process
│   ├── index.ts                   # Window creation, IPC handlers
│   ├── preload.ts                 # Context bridge API
│   └── ipc/
│       ├── handlers.ts            # IPC handler registration
│       ├── file-system.ts         # File system operations
│       ├── vault-parser.ts        # Vault parsing and graph data
│       ├── vault-watcher.ts       # File watching with chokidar
│       ├── chat-handler.ts        # Chat IPC
│       ├── byo-agents.ts          # Codex / Grok CLI / Claude sign-in and chat
│       └── realtime-tools.ts      # Voice tool calls against the vault
├── src/
│   ├── app/
│   │   ├── api/chat/              # Multi-provider AI chat route
│   │   ├── api/realtime/          # OpenAI and Grok voice sessions
│   │   ├── layout.tsx             # Root layout
│   │   ├── page.tsx               # Entry page
│   │   └── globals.css            # Tailwind v4 + shadcn tokens
│   ├── components/
│   │   ├── ui/                    # shadcn/ui primitives
│   │   ├── graph/                 # Galaxy, Terrain, Cluster, Particle
│   │   ├── editor/                # Markdown editor and preview
│   │   ├── sidebar/               # File tree browser
│   │   ├── chat/                  # AI chat and voice waveform
│   │   ├── settings/              # Settings panel
│   │   └── layout/                # Panel orchestration
│   ├── hooks/                     # Voice and WebMCP
│   ├── stores/                    # Zustand state
│   ├── lib/                       # Wiki-links, note stats, Electron API
│   └── types/
├── shared/                        # Code used by both Electron and tests
├── scripts/                       # Dev script and unit tests (verify-*.ts)
├── docs/                          # GitHub Pages marketing site
├── .github/workflows/             # CI, Pages deploy, release
├── CHANGELOG.md
├── LICENSE
├── package.json
└── tsconfig.json
```

## WebMCP

The marketing site registers a few read-only tools when the browser has [`document.modelContext`](https://webmachinelearning.github.io/webmcp/) or the older `navigator.modelContext` fallback (26 August 2026 draft). Without that API the page is unchanged.

Marketing tools: `get-product-info`, `get-install-instructions`, `get-github-url`, `get-contact`, `jump-to-section`.

The desktop renderer does the same for `search-notes` and `open-note`. Those return paths, not note bodies.

## License

MIT
