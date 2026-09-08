# Notes and editor

Notes are markdown files in the open vault. The Notes panel edits them in CodeMirror, auto-saves, previews, and renames the file when the `# Title` heading changes.

## Sub-features

- `notes-empty` shows `No note selected` when no tab is open.
- `notes-create-files` creates a note from the Files `New Note` button.
- `notes-create-editor` creates a note from the empty-editor `New Note` button.
- `notes-create-shortcut` creates a note from Control+N.
- `notes-open-tree` opens a note from the Files tree.
- `notes-edit-autosave` writes body text and persists it to disk after 800 ms.
- `notes-preview` switches to preview and back.
- `notes-heading-rename` renames the file 1500 ms after the `# Title` changes.
- `notes-wiki-preview` follows a preview wiki-link to the linked note.
- `notes-wiki-alias` shows the alias label for `[[Note|label]]` and still opens `Note`.
- `notes-wiki-ambiguous` fills Files search when several notes share the link name, instead of opening a guessed file.
- `notes-wiki-create` creates the note when a preview link has no match, opens it, and switches back to the editor.
- `notes-stats` shows `{n} words · {n} chars · {n} min read · {n} lines` under the editor and updates as you type.
- `notes-theme` toggles the editor between dark and light from the Notes toolbar.
- `notes-close-tab` closes a tab from its `Close tab` button and returns to `No note selected` when it was the last one.
- `notes-delete` removes a note from the Files row menu after a confirm, closing its tab and deleting the file.

## How to get to it (user POV)

- Choose `New Note` in the Files header, or in the Files `No notes yet` empty state.
- Choose `New Note` in the empty Notes panel.
- Press Control+N (Command+N on macOS) while focus is not eating the chord. Escape cancels the name field.
- Choose a file row in the Files tree. Right-click it for `Copy Path` and `Delete`.
- With a note open, type in the editor, choose `Switch to preview`, or choose `Switch to light editor`.
- Hover a tab for its `Close tab` button.

## Driving it with verify-traces

Preconditions:

- Doctor passed on the isolated instance.
- Seeded `Verify Alpha` and `Verify Beta` exist.
- No note titled `Verify Gamma` exists.

- **Empty state.** Close every tab with `node helpers/drive.mjs click --title "Close tab"` until none is left. The empty Notes panel shows `No note selected` and a `New Note` button, and `.cm-content` is gone.
- **Create from Files.** Choose `New Note`. Run `node helpers/drive.mjs click --title "New Note"`. An input with placeholder `Note name...` appears.
- **Name the note.** Type the title. Run `node helpers/drive.mjs fill --placeholder "Note name..." --value "Verify Gamma"` and `node helpers/drive.mjs press --key Enter`. The Files tree shows `Verify Gamma`, the note count increases by one, and a tab named `Verify Gamma` is active.
- **Confirm editor.** Run `node helpers/drive.mjs wait-text --text "Verify Gamma"`. The editor contains `# Verify Gamma` and `.cm-content` exists.
- **Create from empty editor.** Close tabs until `No note selected` returns, then `node helpers/drive.mjs click --text "New Note"`. Same `Note name...` path. Title on this button is `New note` (lowercase n) if you click the header plus instead of the CTA.
- **Shortcut create.** Run `node helpers/drive.mjs shortcut --key n`. The same `Note name...` field appears.
- **Open from tree.** Run `node helpers/drive.mjs click --text "Verify Alpha"`. The active tab reads `Verify Alpha` and the editor shows `# Verify Alpha`.
- **Edit and save.** Append a line at the end of the note. Run `node helpers/drive.mjs type --selector ".cm-line:last-child" --text "Gamma body from verify-traces"`. Wait at least 800 ms. Run `node helpers/drive.mjs read-vault --rel "Verify Gamma.md"`. Stdout contains `Gamma body from verify-traces` after the heading.
- **Status bar.** Snapshot text after the edit matches `\d+ words · \d+ chars · \d+ min read · \d+ lines` and the counts are higher than right after create (`2 words · 16 chars · 1 min read · 3 lines` for a fresh `# Verify Gamma`).
- **Preview.** Run `node helpers/drive.mjs click --title "Switch to preview"`. `.cm-content` is gone, the preview shows the heading, and every wiki-link is an `a.md-wiki-link` with `data-wiki-target`. `[data-editor-theme]` stays `dark` unless the toolbar or Settings changed it. Run `node helpers/drive.mjs click --title "Switch to editor"` to return.
- **Theme.** Run `node helpers/drive.mjs click --title "Switch to light editor"`. `[data-editor-theme]` becomes `light`. Run `node helpers/drive.mjs click --title "Switch to dark editor"` to return.
- **Wiki-link.** With a note in preview, run `node helpers/drive.mjs click --selector 'a.md-wiki-link[data-wiki-target="Verify Beta"]'`. The Beta tab opens and the preview `h1` reads `Verify Beta`. If the selector finds nothing, report that entry point unreachable instead of opening Beta from the tree.
- **Alias.** A preview link written `[[Verify Beta|the other note]]` shows `the other note` as its text and the same click opens Beta.
- **Ambiguous name.** Seed `Verify Index.md` at the vault root and in `Verify Sub/` on disk so two notes share that name. Open a note whose body contains `[[Verify Index]]`, switch to preview, and click `a.md-wiki-link[data-wiki-target="Verify Index"]`. The Files search value becomes `Verify Index`, `filesText` shows only the two `Verify Index` rows, and the tab list is unchanged. Do not treat opening the first candidate as a pass.
- **Unresolved link.** In a note body type `[[Verify Missing]]`, switch to preview, and run `node helpers/drive.mjs click --selector 'a.md-wiki-link.is-unresolved[data-wiki-target="Verify Missing"]'`. `Verify Missing` appears in `filesText` and as the active tab, `.cm-content` is back because preview turned off, and `read-vault --rel "Verify Missing.md"` prints `# Verify Missing`.
- **Heading rename.** Create a fresh `Verify Delta` so its only line is `# Verify Delta`. Run `node helpers/drive.mjs type --selector ".cm-line" --text " Renamed"`. The first `.cm-line` reads `# Verify Delta Renamed`. Wait at least 1500 ms. The tab, tree row, and vault file become `Verify Delta Renamed.md`. `read-vault --rel "Verify Delta Renamed.md"` succeeds and `Verify Delta.md` is gone.
- **Delete.** Run `node helpers/drive.mjs click --text "Verify Delta Renamed" --button right`. `role=menuitem` entries `Copy Path` and `Delete` appear. Run `node helpers/drive.mjs click --text "Delete" --accept-dialog`. The row leaves `filesText`, the note count drops by one, its tab closes, and `read-vault --rel "Verify Delta Renamed.md"` fails with `missing`.
- **Proof.** Capture the populated editor. Run `node helpers/drive.mjs snapshot --path "$TRACES_VERIFY_EVIDENCE/notes-editor/after-create.snapshot.json"` and `node helpers/drive.mjs screenshot --path "$TRACES_VERIFY_EVIDENCE/notes-editor/after-create.png"`. Copy the `read-vault` stdout to `$TRACES_VERIFY_EVIDENCE/notes-editor/after-create.md`. The snapshot `filesText` includes the note title and `hasCodeMirror` is true. The PNG shows the Notes panel.

## Gotchas

- Files header title is `New Note`. Empty-editor header title is `New note`. The empty-state CTA uses visible text `New Note`.
- A new note is created next to the active file, or at the vault root if nothing is open. Baseline seeds sit at the vault root, so `Verify Gamma.md` is the usual path.
- CodeMirror does not update if you set `innerText` from `eval`. Use `type` or real key events. `type --focus-editor` inserts at the current cursor, usually the start of the file, so the text lands in front of `# Title` and turns the heading line into plain text. That still proves autosave, but it disables heading rename for that note. `type --selector ".cm-line:last-child"` clicks past the end of the last line and appends.
- Auto-save is 800 ms. Heading rename is 1500 ms and only fires while the first line is still a `# ` heading. Assert disk, not only the tab label.
- `Close tab` is `opacity: 0` until hover. `click --title "Close tab"` still hits it. Each click closes the first tab in the bar.
- Delete uses `window.confirm`. Without `--accept-dialog` the renderer blocks on the dialog and every later drive command times out.
- In an empty vault, Files shows `No notes yet` with its own `New Note` and `Open Folder`, and the graph adds a third pair. `click --text "New Note"` resolves to the Files one.
- Titles are trimmed and `.md` is stripped from the typed name. Assert the rendered name `Verify Gamma`, not `Verify Gamma.md`.
- Browser-only Next.js will show `No note selected` forever. Doctor must have seen `electronAPI`.
- Do not prove create by writing a file into the vault from the shell.
- Ambiguous wiki-links are proven from the preview `<a>`. Clicking the CodeMirror `.cm-wiki-link` widget can unwrap before the click handler runs. Report that editor-widget path unreachable; do not fail the feature if preview works.
- Alias clicks still resolve the target on the left of `|`, not the visible label.
- A misspelled link is a create, not a miss. Clicking `[[Verify Betta]]` in preview writes `Verify Betta.md`. Check `filesText` and the note count after any preview click you did not expect to create a file.
