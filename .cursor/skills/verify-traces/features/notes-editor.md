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

## How to get to it (user POV)

- Choose `New Note` in the Files header.
- Choose `New Note` in the empty Notes panel.
- Press Control+N (Command+N on macOS) while focus is not eating the chord.
- Choose a file row in the Files tree.
- With a note open, type in the editor, or choose `Switch to preview`.

## Driving it with verify-traces

Preconditions:

- Doctor passed on the isolated instance.
- Seeded `Verify Alpha` and `Verify Beta` exist.
- No note titled `Verify Gamma` exists.

- **Empty state.** If a tab is already open, skip unless you closed every tab. The empty Notes panel shows `No note selected` and a `New Note` button.
- **Create from Files.** Choose `New Note`. Run `node helpers/drive.mjs click --title "New Note"`. An input with placeholder `Note name...` appears.
- **Name the note.** Type the title. Run `node helpers/drive.mjs fill --placeholder "Note name..." --value "Verify Gamma"` and `node helpers/drive.mjs press --key Enter`. The Files tree shows `Verify Gamma`, the note count increases by one, and a tab named `Verify Gamma` is active.
- **Confirm editor.** Run `node helpers/drive.mjs wait-text --text "Verify Gamma"`. The editor contains `# Verify Gamma` and `.cm-content` exists.
- **Create from empty editor.** Close tabs until `No note selected` returns, then `node helpers/drive.mjs click --text "New Note"`. Same `Note name...` path. Title on this button is `New note` (lowercase n) if you click the header plus instead of the CTA.
- **Shortcut create.** Run `node helpers/drive.mjs shortcut --key n`. The same `Note name...` field appears.
- **Open from tree.** Run `node helpers/drive.mjs click --text "Verify Alpha"`. The active tab reads `Verify Alpha` and the editor shows `# Verify Alpha`.
- **Edit and save.** Focus the editor and append a line. Run `node helpers/drive.mjs type --focus-editor --text $'\n\nGamma body from verify-traces'`. Wait at least 800 ms. Run `node helpers/drive.mjs read-vault --rel "Verify Gamma.md"`. Stdout contains `Gamma body from verify-traces`.
- **Preview.** Run `node helpers/drive.mjs click --title "Switch to preview"`. The preview shows the heading and any `[[Verify Beta]]` link. `[data-editor-theme]` stays `dark` unless Settings changed it. Run `node helpers/drive.mjs click --title "Switch to editor"` to return.
- **Wiki-link.** With Alpha in preview, choose the `Verify Beta` link (class `md-wiki-link`, `data-wiki-target="Verify Beta"`). The Beta tab opens. If the click misses the `<a>`, report that entry point unreachable instead of opening Beta from the tree.
- **Alias.** A preview link written `[[Verify Beta|the other note]]` must show `the other note` and still open Beta.
- **Ambiguous name.** Seed a second `Verify Index.md` in a subfolder so two notes share that name. Open a note whose body contains `[[Verify Index]]`, switch to preview, and click the link. Files search becomes `Verify Index`, the tree shows only the matching rows, and no new tab opens. Do not treat opening the first candidate as a pass.
- **Heading rename.** In the editor for `Verify Gamma`, change `# Verify Gamma` to `# Verify Gamma Renamed`. Wait at least 1500 ms. The tab, tree row, and vault file become `Verify Gamma Renamed.md`. `read-vault --rel "Verify Gamma Renamed.md"` succeeds and `Verify Gamma.md` is gone.
- **Proof.** Capture the populated editor. Run `node helpers/drive.mjs snapshot --path "$TRACES_VERIFY_EVIDENCE/notes-editor/after-create.snapshot.json"` and `node helpers/drive.mjs screenshot --path "$TRACES_VERIFY_EVIDENCE/notes-editor/after-create.png"`. Copy the `read-vault` stdout to `$TRACES_VERIFY_EVIDENCE/notes-editor/after-create.md`. The snapshot text includes the note title. The PNG shows the Notes panel.

## Gotchas

- Files header title is `New Note`. Empty-editor header title is `New note`. The empty-state CTA uses visible text `New Note`.
- A new note is created next to the active file, or at the vault root if nothing is open. Baseline seeds sit at the vault root, so `Verify Gamma.md` is the usual path.
- CodeMirror does not update if you set `innerText` from `eval`. Use `type --focus-editor` or real key events. `Input.insertText` lands at the current cursor, often the start of the file, so the typed line can prepend `# Title`. That still proves autosave. Arrow to the end first if you need the body after the heading.
- Auto-save is 800 ms. Heading rename is 1500 ms. Assert disk, not only the tab label.
- Titles are trimmed and `.md` is stripped from the typed name. Assert the rendered name `Verify Gamma`, not `Verify Gamma.md`.
- Browser-only Next.js will show `No note selected` forever. Doctor must have seen `electronAPI`.
- Do not prove create by writing a file into the vault from the shell.
- Ambiguous wiki-links are proven from the preview `<a>`. Clicking the CodeMirror `.cm-wiki-link` widget can unwrap before the click handler runs. Report that editor-widget path unreachable; do not fail the feature if preview works.
- Alias clicks still resolve the target on the left of `|`, not the visible label.
