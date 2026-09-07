# Graph

The Graph panel draws the vault as a 3D wiki-link graph. Galaxy, Terrain, Cluster, and Particle share one camera. Clicking a node opens that note.

## Sub-features

- `graph-visible` shows the WebGL canvas while Graph is expanded.
- `graph-galaxy` selects Galaxy View.
- `graph-terrain` selects Terrain View.
- `graph-cluster` selects Cluster View.
- `graph-particle` selects Particle View and reveals the shape picker.
- `graph-shape` switches Möbius, Toroidal Vortex, Spherical Harmonics, Lissajous, and Fractal Branches.
- `graph-zoom` uses Zoom in and Zoom out.
- `graph-fullscreen` enters and exits fullscreen graph.
- `graph-collapse` collapses Graph to a left-edge tab and expands it again.
- `graph-empty` overlays `No notes yet` with `New Note` and `Open Folder` when the vault has no notes.

## How to get to it (user POV)

- Look at the center Graph panel after launch. It is expanded by default.
- Choose a view button in the `Graph view` group, top left of the graph.
- In Particle View, choose a shape in the `Particle shape` group.
- Choose `Fullscreen`, or press Control+\. Leave with `Exit fullscreen`, Control+\ again, or Escape.
- Choose `Collapse graph panel`, or press Control+2. Expand from the `Graph` tab on the left.
- Delete every note, or open an empty folder. The overlay sits over whichever view is active.

## Driving it with verify-traces

Preconditions:

- Doctor passed on the isolated instance.
- Seeded Alpha and Beta are present so the graph has at least two nodes and one edge.
- Settings is closed. An open Settings overlay hides the graph (`visibility: hidden`).

- **Canvas present.** Run `node helpers/drive.mjs snapshot --path "$TRACES_VERIFY_EVIDENCE/graph/baseline.snapshot.json"`. `canvases` is greater than 0. Snapshot text does not include `Loading your knowledge graph`.
- **Galaxy.** Run `node helpers/drive.mjs click --name "Galaxy View"`. The button `aria-pressed` is `true`. Other view buttons are `false`.
- **Terrain.** Run `node helpers/drive.mjs click --name "Terrain View"`. `Terrain View` is pressed.
- **Cluster.** Run `node helpers/drive.mjs click --name "Cluster View"`. `Cluster View` is pressed.
- **Particle.** Run `node helpers/drive.mjs click --name "Particle View"`. `Particle View` is pressed and the `Particle shape` group is in the snapshot.
- **Shape.** Run `node helpers/drive.mjs click --name "Use Toroidal Vortex particle shape"`. The button with `data-particle-shape="toroidal"` has `aria-pressed="true"`. Repeat for `Use Möbius Strip particle shape`, `Use Spherical Harmonics particle shape`, `Use Lissajous Curve particle shape`, and `Use Fractal Branches particle shape` if you are covering every shape.
- **Zoom.** Run `node helpers/drive.mjs click --title "Zoom in"` then `node helpers/drive.mjs click --title "Zoom out"`. The canvas stays mounted. There is no numeric zoom readout to assert.
- **Fullscreen.** Run `node helpers/drive.mjs click --title "Fullscreen"`. Files, Notes, Chat, and the Settings gear go away. `Exit fullscreen` is present. Run `node helpers/drive.mjs click --title "Exit fullscreen"` to return. `press --key Escape` also returns.
- **Collapse.** Run `node helpers/drive.mjs click --title "Collapse graph panel"`. A left-edge tab titled `Expand graph` appears and `canvases` drops to 0. Its label is `Graph` in markup and `GRAPH` in snapshot text because the strip uppercases. Run `node helpers/drive.mjs click --title "Expand graph"` to restore the canvas.
- **Empty vault.** Precondition: the isolated vault has no notes. Delete the seeds from the row menu (`notes-delete`) or remove them from `$TRACES_VERIFY_VAULT` on disk as setup, then wait for the watcher. Snapshot: `canvases` is 1, `filesText` reads `No notes yet ... 0 notes`, and `document.querySelector('[role=status]').innerText` starts with `No notes yet`. Run `node helpers/drive.mjs click --selector '[role=status] button'`. The `Note name...` field appears. Press Escape, then restore `Verify Alpha.md` and `Verify Beta.md` on disk and confirm the overlay is gone.
- **Proof.** After Particle View is selected, run `node helpers/drive.mjs snapshot --path "$TRACES_VERIFY_EVIDENCE/graph/particle.snapshot.json"` and `node helpers/drive.mjs screenshot --path "$TRACES_VERIFY_EVIDENCE/graph/particle.png"`. The snapshot has `Particle View` pressed and `canvases > 0`. The PNG shows the graph panel, not Settings.

Module support, not a substitute: `pnpm verify:particles` from the repo root. Keep the log if the change was layout math.

## Gotchas

- Node click-to-open hits a `<canvas>`. There is no accessible name per star. If a canvas click fails to open a note, report `graph-open-node` unreachable. Do not open the note from the Files tree and call the graph click proven.
- Settings hides the graph without unmounting it. Close Settings before asserting views.
- Particle shape buttons exist only in Particle View.
- Low Power Mode is a Settings > Graph checkbox. It is not required for the view toggles.
- Control+2 also collapses Graph. If you already collapsed it from the button, the shortcut expands it again.
- The first switch into a heavy view can swallow the next click while the scene compiles. One cold Cluster to Particle click left Cluster pressed; six warm retries at 0.3 s and 1.5 s all passed. Read `aria-pressed` after every view click and click once more if it did not change.
- In an empty vault `click --text "New Note"` resolves to the Files empty-state button, not the overlay. Use `--selector '[role=status] button'` for the graph one. Do not click either `Open Folder`.
- The graph still needs Electron. A browser tab at `:3333` draws an empty scene with no vault nodes.
