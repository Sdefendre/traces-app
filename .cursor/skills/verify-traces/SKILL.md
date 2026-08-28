---
name: verify-traces
description: Use when proving Traces desktop behavior (Electron + Next.js on localhost:3333), the GitHub Pages marketing site, notes, graph, search, launch, doctor, or cleanup of a verification instance.
---

# Verify Traces

Traces is a local-first Electron desktop app. Notes are markdown files in a folder. Wiki-links become a 3D graph. Chat can edit those files. The marketing site at https://sdefendre.github.io/traces-app/ is static HTML in `docs/`.

Primary surface: the desktop window. Secondary surface: the Pages site. Opening `http://localhost:3333` in a normal browser is not the app. File, graph, and editor APIs no-op without `window.electronAPI`.

This skill is for the next agent. Drive the real window. Do not call internal store setters to fake a user action. Do not upload vault notes anywhere.

## Launch

Do not use `pnpm dev` for verification. `scripts/dev.mjs` starts Next on port 3333 and Electron with the real login `HOME`. Electron then creates and uses `~/Desktop/Traces Notes`. That is the user's vault.

There is no vault env var. `main/index.ts` hardcodes `path.join(app.getPath('home'), 'Desktop', 'Traces Notes')`. Isolation is a fake `HOME` plus `--user-data-dir` plus `--remote-debugging-port`.

From the repo root:

```bash
chmod +x .cursor/skills/verify-traces/helpers/*.sh
.cursor/skills/verify-traces/helpers/launch.sh
source /tmp/traces-verify-<run-id>/run.env
```

`launch.sh` does this, in order:

1. Refuses if port 3333 or the CDP port (default 9333) is already taken. It does not steal a port.
2. Creates `/tmp/traces-verify-<run-id>/` with `home/Desktop/Traces Notes`, `user-data/`, and `logs/`.
3. Seeds `Verify Alpha.md` and `Verify Beta.md` in that vault. Alpha wiki-links to Beta.
4. Compiles the Electron main process with `pnpm exec tsc -p tsconfig.electron.json`.
5. Starts `pnpm exec next dev -p 3333 --turbo` in its own session.
6. Starts `pnpm exec electron .` with `HOME` set to the fake home, `--user-data-dir` under the run dir, `--remote-debugging-port` (default 9333), `--no-sandbox`, and `--disable-gpu`.
7. Waits until Next answers, CDP lists a page on `http://localhost:3333`, `document.title` is `Traces`, `window.electronAPI` exists, and the loading copy is gone.
8. Writes `state.json` and `run.env`. Evidence directory: `.cursor/skills/verify-traces/evidence/<run-id>/`.

Ready signals:

- Next: HTTP 200 from `http://127.0.0.1:3333`
- Electron: `http://127.0.0.1:9333/json/list` includes a `page` whose URL matches `localhost:3333`
- Renderer: `node helpers/drive.mjs ready` prints `"title": "Traces"` and `"hasElectronApi": true`

Electron in dev always loads `http://localhost:3333`. You cannot run two desktop instances side by side. If 3333 is taken, stop. Cleanup the verify run that owns it, or leave the foreign process alone. Never `pkill` by name.

`pnpm start` after `pnpm build` loads the static export from `out/`. That path is not the verification launch. Production also uses the real login home.

If `node_modules/.bin/electron --version` fails, the Electron binary was skipped on install. From the repo root run `node node_modules/electron/install.js`. Do not treat that as a product change.

## Doctor

Read-only. Run this first whenever the instance looks wrong. Source `run.env` first.

```bash
source "$TRACES_VERIFY_RUN/run.env"
.cursor/skills/verify-traces/helpers/doctor.sh
```

Doctor fails unless all of these are true:

- `TRACES_VERIFY_RUN/state.json` exists and was written by `launch.sh`
- Isolated `HOME` is not the real login home
- Vault path is `$HOME/Desktop/Traces Notes` under that isolated home, and is not `~/Desktop/Traces Notes` of the real user
- Recorded Next and Electron PIDs are still alive
- `http://127.0.0.1:3333` returns 200 or 304
- CDP on the recorded port answers
- Renderer `document.title` is `Traces`
- `window.electronAPI.getVaultPath()` equals the isolated vault path
- The window is not stuck on `Loading your knowledge graph...`

If doctor fails, do not drive. Cleanup the run you started, then launch again. Do not attach to a `pnpm dev` window that used the real home.

Logic scripts in `scripts/verify-*.mjs` and `scripts/verify-*.ts` do not prove the window. Run them when the change is in that module. They are listed under Helpers. `scripts/run-verification.sh` kills port 3333 by `lsof` and `pkill -f scripts/dev.mjs`. Do not use that script as verification cleanup.

## Drive

Harness: the helpers in this skill. Source `run.env`, then doctor, then one feature file under `features/`.

```bash
source "$TRACES_VERIFY_RUN/run.env"
DRIVE=".cursor/skills/verify-traces/helpers/drive.mjs"
node "$DRIVE" ready
node "$DRIVE" click --title "New Note"
node "$DRIVE" fill --placeholder "Note name..." --value "Verify Gamma"
node "$DRIVE" press --key Enter
node "$DRIVE" wait-text --text "Verify Gamma"
node "$DRIVE" snapshot --path "$TRACES_VERIFY_EVIDENCE/notes.json"
node "$DRIVE" screenshot --path "$TRACES_VERIFY_EVIDENCE/notes.png"
```

`drive.mjs` talks to the Electron renderer over CDP. It picks the `page` target whose URL is `localhost:3333`. Ignore DevTools targets.

Stable handles from this repo, not coordinates:

| What | Handle |
| --- | --- |
| Files search | `input` placeholder `Search...` |
| New note, Files header | `button` title `New Note` |
| Open folder | `button` title `Open Folder`. Native dialog. Do not click it. |
| Collapse Files | `button` title `Collapse sidebar` |
| New note empty editor | button text `New Note`, or title `New note` |
| Note name field | `input` placeholder `Note name...` |
| Empty editor copy | `No note selected` |
| Editor theme root | `[data-editor-theme=light\|dark]` |
| CodeMirror | `.cm-content` |
| Preview toggle | title `Switch to preview` or `Switch to editor` |
| Graph views | `role=group` `aria-label="Graph view"`, buttons `Galaxy View`, `Terrain View`, `Cluster View`, `Particle View` |
| Particle shapes | `[data-particle-shape=mobius\|toroidal\|harmonics\|lissajous\|fractal]`, `aria-label` like `Use Möbius Strip particle shape` |
| Graph zoom / chrome | titles `Zoom out`, `Zoom in`, `Collapse graph panel`, `Fullscreen`, `Exit fullscreen` |
| Settings gear | title `Settings` |
| Settings close | title `Close settings (Esc)` or key `Escape` |
| Settings nav | visible text `AI & Models`, `Editor`, `Graph`, `General` |
| Chat heading | `Chat`, empty-state `TracesAI` |
| Chat compose | placeholder `Message your Traces...` |
| File tree row | visible name without `.md` |
| Note count | `{n} notes` at the bottom of Files |
| Vault label | folder name, `Traces Notes` in an isolated launch |

Keyboard, Control on Linux, Meta on macOS. `drive.mjs shortcut` sends Control:

| Shortcut | Action |
| --- | --- |
| Control+1 | Toggle Files |
| Control+2 | Toggle Graph |
| Control+3 | Toggle Notes |
| Control+4 | Toggle Chat |
| Control+n | New note. Same as `window` event `traces:new-note` |
| Control+f | Focus search. Same as `traces:focus-search` |
| Control+\ | Fullscreen graph |

Do not click `Open Folder`. The native dialog is not in the renderer and can point the app at a real folder.

Create notes only with a `Verify ` prefix. After a mutation, prove the file on disk with `node helpers/drive.mjs read-vault --rel "Verify Gamma.md"`. Auto-save is 800 ms. Title rename from `# Heading` is 1500 ms.

Graph node clicks land on a WebGL canvas. There is no DOM node per note. Prove view toggles and particle shape buttons from ARIA. Treat canvas picking as best-effort.

Chat needs a signed-in CLI or an API key. Traces fails closed. Missing Codex, Grok CLI, or Claude is not a product regression. Do not paste keys into Settings to force a chat proof.

The Pages site is `features/pages-site.md`. Use `helpers/pages-check.sh`. That path does not need Electron.

## Evidence

Put proof under `.cursor/skills/verify-traces/evidence/<run-id>/`. Launch creates that directory. Cleanup must not delete it.

Every proof needs:

1. The feature id and the entry point you used, written next to the files.
2. The user action and the resulting state. A final screenshot alone is not enough.
3. A `drive.mjs snapshot` JSON and a `drive.mjs screenshot` PNG of the window after the action.
4. For a write: the vault-relative file contents from `read-vault`, after the auto-save wait. The file must live under the isolated vault.
5. For search: the filtered tree in the snapshot `text`, plus the input `value`.
6. For graph view changes: `aria-pressed="true"` on the chosen view button.

Standards:

- Exercise the real Files / Notes / Graph / Pages path. Do not `useEditorStore.setState` or write the vault from a Node script and call that a UI proof.
- `pnpm verify:editor`, `pnpm verify:particles`, `pnpm verify:wiki-link`, `pnpm verify:webmcp`, `pnpm verify:logic`, `pnpm verify:byo`, and `pnpm verify:byo-runtime` are module proofs. Keep those logs in evidence when the change is in that module. They do not replace a window drive.
- Mocks are already how `scripts/verify-webmcp.mjs` and `scripts/verify-byo-agents.ts` work. That is the production boundary for those scripts. Do not invent a fake `electronAPI` in the window.
- Never upload notes. Never copy vault files to the Pages site, a gist, or chat.

Name files like `notes-editor/create-gamma.snapshot.json` and `notes-editor/create-gamma.png`.

## Cleanup

```bash
source "$TRACES_VERIFY_RUN/run.env"
.cursor/skills/verify-traces/helpers/cleanup.sh
```

Cleanup kills the Next and Electron PIDs and process groups recorded in `state.json`. It then deletes `/tmp/traces-verify-<run-id>/` only. It prints the evidence directory and lists it.

Never `pkill electron`, `pkill -f next`, or `lsof -ti:3333 | xargs kill`. Those can destroy a human `pnpm dev` session.

After cleanup, confirm:

```bash
test -d "$TRACES_VERIFY_EVIDENCE"
ls "$TRACES_VERIFY_EVIDENCE"
```

If those fail, cleanup ate the proof. That is a skill bug.

Leave seeded `Verify *` files behind only if cleanup could not remove the scratch dir. Isolated vaults live under `/tmp/traces-verify-*`. The real `~/Desktop/Traces Notes` must still be untouched.

## Helpers

All of these are executable and live in `.cursor/skills/verify-traces/helpers/`.

```bash
helpers/launch.sh
# starts the isolated instance, prints source /tmp/traces-verify-<id>/run.env

source /tmp/traces-verify-<id>/run.env
helpers/doctor.sh
# read-only instance check

node helpers/drive.mjs ready
node helpers/drive.mjs doctor-json
node helpers/drive.mjs click --title "New Note"
node helpers/drive.mjs click --name "Galaxy View"
node helpers/drive.mjs click --text "Verify Alpha"
node helpers/drive.mjs fill --placeholder "Search..." --value "alpha"
node helpers/drive.mjs press --key Enter
node helpers/drive.mjs shortcut --key f
node helpers/drive.mjs type --focus-editor --text $'\n\nmore text'
node helpers/drive.mjs wait-text --text "Verify Alpha"
node helpers/drive.mjs snapshot --path "$TRACES_VERIFY_EVIDENCE/snap.json"
node helpers/drive.mjs screenshot --path "$TRACES_VERIFY_EVIDENCE/snap.png"
node helpers/drive.mjs vault-path
node helpers/drive.mjs read-vault --rel "Verify Alpha.md"
node helpers/drive.mjs eval --js 'document.title'

helpers/pages-check.sh "$TRACES_VERIFY_EVIDENCE"
# curl https://sdefendre.github.io/traces-app/ and assert clone/run copy

helpers/cleanup.sh
# kill recorded PIDs, delete /tmp/traces-verify-<id>, keep evidence
```

Repo logic scripts, from the repo root. Run the matching one when you change that code. They use temp dirs. They do not open the window.

```bash
pnpm verify:editor      # editor store, tab close, rename, failed save
pnpm verify:particles   # particle layout and morph math
pnpm verify:wiki-link   # [[Note|label]] parse and preview
pnpm verify:webmcp      # marketing tools + in-app path helpers
pnpm verify:logic       # parseVault + file tree after build:electron
pnpm verify:byo         # bring-your-own agent argument builders
pnpm verify:byo-runtime # compiled BYO chat against a temp vault
```

Feature map: `features/README.md`. Keep it honest with `/maintain-verification-skill` when the app changes.
