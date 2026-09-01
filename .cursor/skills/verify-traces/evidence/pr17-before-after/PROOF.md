# Before / After proof for the two UI follow-ups in #17

Screenshot proof for the UI changes that landed in
[Sdefendre/traces-app #17](https://github.com/Sdefendre/traces-app/pull/17)
(merged as `5d6692f`) without labeled Before/After shots.

Captured on 2026-09-01 with `helpers/launch.sh` (isolated `HOME`, scratch
vault, `next dev` on 3333, Electron over CDP 9333). Same Electron window and
viewport for every pair: 1802 x 1073 CSS px, `--disable-gpu` on Xvfb `:1`.

- **After** = current `main` (`5d6692f`), untouched.
- **Before** = current `main` with two temporary local edits only for the
  capture, reverted before commit: `next.config.ts` set to
  `devIndicators: { position: 'bottom-left' }` (the Next default), and
  `src/components/editor/EditorPanel.tsx` checked out from `bd92121`
  (the commit right before #17).

Scratch vault seeded with `Verify Index.md`, `Archive/Verify Index.md`
(two notes that share a name) and `Verify Link Source.md` containing
`[[Verify Index]]`, plus the skill's `Verify Alpha` / `Verify Beta`.

## 1. Next dev badge vs Settings gear (`dev-badge/`)

What changed: `devIndicators.position` moved from Next's default
`bottom-left` to `bottom-right`, so the dev-tools "N" badge no longer sits on
the Settings gear.

Layout: Chat panel open (`Control+4`). With Chat open there is no collapsed
panel strip, so `AppShell.tsx` places the gear at `left: 12px`, which is the
spot the default badge occupies.

| | Badge rect (x, y, w, h) | Gear rect | Overlap | `elementFromPoint` at gear centre |
| --- | --- | --- | --- | --- |
| Before | 22, 1020, 32, 32 | 12, 1033, 30, 30 | 385 px² of 900 px² | `NEXTJS-PORTAL` (badge eats the click) |
| After | 1748, 1020, 32, 32 | 12, 1033, 30, 30 | 0 px² | `svg` (the gear icon) |

Files: `before.png`, `after.png` (full window), `before-corners-3x.png`,
`after-corners-3x.png` (bottom-left and bottom-right corners, 3x nearest
neighbour zoom).

The badge is a `next dev` overlay only. It does not exist in the static
GitHub Pages build or in `pnpm start`.

## 2. Ambiguous `[[wiki-link]]` click (`wiki-link/`)

What changed: clicking a `[[link]]` whose name matches several notes now
fills the Files search with that name and filters the tree to the candidates.
It does not open a guessed note and it does not create a new file.

Steps for both shots: click `Verify Link Source` in the Files tree, click
`Switch to preview`, click the `Verify Index` wiki-link anchor
(`a[data-wiki-target]`), wait 1.5 s.

| | Files search value | Tree rows | Editor | Vault files |
| --- | --- | --- | --- | --- |
| Before | `""` | all 5 notes | new tab `Verify Index` opened, body `Archive copy of the shared name.` (first candidate, guessed) | 5, unchanged |
| After | `Verify Index` (focused) | `Archive / Verify Index`, `Verify Index` only | still `Verify Link Source` in preview | 5, unchanged |

Files: `before.png`, `after.png`, `before.snapshot.json`,
`after.snapshot.json` (`drive.mjs snapshot`; check `inputs[0].value` and
`text`).

Pre-#14 builds created a duplicate note on this click; the pre-#17 build
shown here guessed the first candidate. #17 replaces both with the filter.

## Gotcha recorded

Clicking the CodeMirror wiki-link widget in editor mode (`.cm-wiki-link`) via
a CDP mouse press/release moved the cursor into the link, which unwraps the
widget before its click handler runs, so nothing happened. The preview anchor
is the reliable click path for this proof. Not changed in this PR.

## Cleanup

Each run was stopped with `helpers/cleanup.sh`. Ports 3333 and 9333 were
free and no `electron` / `next dev` processes remained afterwards. The real
`~/Desktop/Traces Notes` was never created or touched.
