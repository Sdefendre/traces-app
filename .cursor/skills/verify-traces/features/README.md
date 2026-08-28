# Traces verification map

This directory is the maintained source for verifying user-facing Traces behavior. Read the index before driving the app, then use the matching feature file as the recipe.

## Baseline preconditions

- Launch with `.cursor/skills/verify-traces/helpers/launch.sh`, then `source $TRACES_VERIFY_RUN/run.env`.
- Doctor must pass. Isolated vault path must equal `$TRACES_VERIFY_VAULT`.
- Seeded notes `Verify Alpha.md` and `Verify Beta.md` are present. Alpha contains `[[Verify Beta]]`.
- Drive through `node .cursor/skills/verify-traces/helpers/drive.mjs`.
- Never drive an Electron window that was not started by this verification run.
- Never click `Open Folder`. Never upload notes.

## Driving conventions

- Start every recipe from the baseline state unless its preconditions say otherwise.
- Prefer `title`, `aria-label`, `placeholder`, and visible text over CSS position.
- Treat every command as literal. Keep quoted names and flags unchanged.
- Create only notes whose names start with `Verify `.
- After a write, wait for auto-save (800 ms) or title rename (1500 ms), then `read-vault`.
- Restore seeded data after a mutation. Do not remove proof artifacts during cleanup.

## Proof and skip reporting

- Capture the user action and the resulting state, not only the final screen.
- Desktop proof includes a `drive.mjs snapshot` JSON and a screenshot of the Electron window.
- Mutation proof includes the isolated vault file on disk.
- Record the feature ID and entry point used with every artifact.
- Report an unreachable path with the attempted command and the unmet precondition.
- Do not report a skipped entry point as verified through a different path.
- `pnpm verify:*` logs support a module change. They do not stand in for a skipped UI entry point.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing the user-visible behavior. It then uses exactly four H2 sections in this order.

1. `Sub-features` lists short IDs with one line for each behavior.
2. `How to get to it (user POV)` lists every user entry point.
3. `Driving it with verify-traces` starts with `Preconditions:` and uses labeled bullets that pair each user action with an exact command and observable result.
4. `Gotchas` lists traps that can waste or invalidate a verification run.

Keep implementation details out of the map. Name only user paths, stable handles, required state, commands, and observable proof.

## Features

- [Notes and editor](./notes-editor.md) covers create, open, edit, preview, auto-save, heading rename, and wiki-link navigation.
- [Graph](./graph.md) covers Galaxy, Terrain, Cluster, Particle views, particle shapes, zoom, and fullscreen.
- [Search](./search.md) covers Files search, Control+F, filtering, empty results, and clear.
- [Pages marketing site](./pages-site.md) covers the public GitHub Pages site and its clone/run copy.
