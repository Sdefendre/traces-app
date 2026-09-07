# Search

Search filters the Files tree by a case-insensitive substring of the vault-relative path. It does not search note bodies. It does not upload anything.

## Sub-features

- `search-focus-click` focuses the Files search box from the mouse.
- `search-focus-shortcut` focuses the box from Control+F.
- `search-match` keeps matching rows and hides the rest.
- `search-empty` shows `No notes match “{query}”` and a `Clear search` button when no path matches.
- `search-clear` restores the full tree when the box is emptied or `Clear search` is chosen.
- `search-collapsed` expands Files first when the sidebar is collapsed.

## How to get to it (user POV)

- Click the `Search...` field at the top of Files.
- Press Control+F (Command+F on macOS).
- A WebMCP `search-notes` tool, when the browser exposes `document.modelContext`, fills the same box. It returns matching paths only, never note bodies.
- Clicking a wiki-link that matches several notes also fills this box. That path is proven in [notes-editor.md](./notes-editor.md), not here.

## Driving it with verify-traces

Preconditions:

- Doctor passed on the isolated instance.
- Seeded `Verify Alpha` and `Verify Beta` are visible in Files.
- Files is expanded. If it is not, `node helpers/drive.mjs click --title "Expand sidebar"`.

- **Click focus.** Run `node helpers/drive.mjs click --placeholder "Search..."`. The next snapshot lists an input whose placeholder is `Search...`.
- **Shortcut focus.** Collapse Files, then run `node helpers/drive.mjs shortcut --key f`. Files expands and the search box is focused.
- **Title match.** Run `node helpers/drive.mjs fill --placeholder "Search..." --value "alpha"`. Snapshot `filesText` includes `Verify Alpha` and does not include `Verify Beta`. Note count at the bottom still reports the full vault size. Filtering is visual only.
- **Path match.** Clear the box, then fill `beta`. `filesText` keeps `Verify Beta` and drops `Verify Alpha`.
- **Empty.** Fill `volcano`. `filesText` reads `No notes match “volcano”` followed by `Clear search`, with no `Verify Alpha` or `Verify Beta` rows. The `{n} notes` footer still shows the real count.
- **Clear.** Run `node helpers/drive.mjs fill --placeholder "Search..." --value ""`, or `node helpers/drive.mjs click --text "Clear search"` from the empty state. Both seeded names return in `filesText` and the input value is empty.
- **Open a result.** With `alpha` in the box, run `node helpers/drive.mjs click --text "Verify Alpha"`. The click reports a `SPAN` inside Files, `.cm-content` appears, and its first line is `# Verify Alpha`.
- **Proof.** Capture the `alpha` filter. Run `node helpers/drive.mjs snapshot --path "$TRACES_VERIFY_EVIDENCE/search/alpha.snapshot.json"` and `node helpers/drive.mjs screenshot --path "$TRACES_VERIFY_EVIDENCE/search/alpha.png"`. The snapshot input value is `alpha` and `filesText` is `TRACES NOTES Verify Alpha 2 notes`. The PNG shows the Files list with Alpha and without Beta.

Module support, not a substitute: `pnpm verify:webmcp` covers `matchNotePaths` and marketing tools. A passing script is not a Files search proof.

## Gotchas

- Search matches the path string, not the markdown body. Body text in Alpha will not match.
- Snapshot `text` is the whole window. Graph node labels are DOM overlays, so `Verify Beta` stays in `text` under any filter. Only `filesText` proves the tree.
- `wait-text --text "Verify Alpha"` is satisfied by the graph label before any note opens. Assert `.cm-content` or the first `.cm-line` instead.
- The query lives in the UI store, so it survives collapsing and expanding Files. Clear it before a recipe that expects an empty box.
- The footer `{n} notes` is the unfiltered vault length. Do not assert it against the visible row count.
- Control+F is a custom handler. It does not open a CodeMirror search panel. If the editor has focus, the AppShell listener still fires because it is on `window`.
- WebMCP `search-notes` is absent in ordinary Electron and Chrome. Missing `document.modelContext` is expected. Do not fail the feature for that.
- Do not read note bodies out of the vault to "confirm" search. Confirm the visible tree.
