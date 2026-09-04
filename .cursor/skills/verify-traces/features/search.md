# Search

Search filters the Files tree by a case-insensitive substring of the vault-relative path. It does not search note bodies. It does not upload anything.

## Sub-features

- `search-focus-click` focuses the Files search box from the mouse.
- `search-focus-shortcut` focuses the box from Control+F.
- `search-match` keeps matching rows and hides the rest.
- `search-empty` shows an empty tree for a query with no path matches.
- `search-clear` restores the full tree when the box is emptied.
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
- **Title match.** Run `node helpers/drive.mjs fill --placeholder "Search..." --value "alpha"`. Snapshot text includes `Verify Alpha` and does not include `Verify Beta`. Note count at the bottom still reports the full vault size. Filtering is visual only.
- **Path match.** Clear the box, then fill `beta`. `Verify Beta` remains. `Verify Alpha` is gone.
- **Empty.** Fill `volcano`. The tree has no `Verify Alpha` or `Verify Beta` rows. The `{n} notes` footer still shows the real count.
- **Clear.** Run `node helpers/drive.mjs fill --placeholder "Search..." --value ""`. Both seeded names return.
- **Open a result.** With `alpha` in the box, run `node helpers/drive.mjs click --text "Verify Alpha"`. The Alpha editor tab opens.
- **Proof.** Capture the `alpha` filter. Run `node helpers/drive.mjs snapshot --path "$TRACES_VERIFY_EVIDENCE/search/alpha.snapshot.json"` and `node helpers/drive.mjs screenshot --path "$TRACES_VERIFY_EVIDENCE/search/alpha.png"`. The snapshot input value is `alpha`. The PNG shows the Files list with Alpha and without Beta.

Module support, not a substitute: `pnpm verify:webmcp` covers `matchNotePaths` and marketing tools. A passing script is not a Files search proof.

## Gotchas

- Search matches the path string, not the markdown body. Body text in Alpha will not match.
- The footer `{n} notes` is the unfiltered vault length. Do not assert it against the visible row count.
- Control+F is a custom handler. It does not open a CodeMirror search panel. If the editor has focus, the AppShell listener still fires because it is on `window`.
- WebMCP `search-notes` is absent in ordinary Electron and Chrome. Missing `document.modelContext` is expected. Do not fail the feature for that.
- Do not read note bodies out of the vault to "confirm" search. Confirm the visible tree.
