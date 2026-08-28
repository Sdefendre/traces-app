# Prove pass: notes-editor

Generator run on 2026-08-28. Followed this skill end to end once.

1. `helpers/launch.sh` started Next on 3333 and Electron with isolated HOME `/tmp/traces-verify-20260828T193747Z-2721/home` and CDP 9333.
2. `helpers/doctor.sh` passed. `window.electronAPI.getVaultPath()` equaled the isolated vault. Title `Traces`. Not loading.
3. Drove `features/notes-editor.md` entry `notes-create-files` then `notes-edit-autosave`. Clicked Files `New Note`, filled `Verify Gamma`, pressed Enter, typed `Gamma body from verify-traces` into CodeMirror, waited for auto-save.
4. Evidence is in `notes-editor/`. Baseline: 2 notes, empty editor. After create: tree shows Verify Gamma, footer `3 notes`, editor tab open, disk file `Verify Gamma.md` contains the typed line. Snapshot `hasElectronApi` true, `hasCodeMirror` true.
5. `helpers/cleanup.sh` killed recorded Next pid 2769 and Electron pid 2875, deleted `/tmp/traces-verify-20260828T193747Z-2721`. This directory remained. `~/Desktop/Traces Notes` was never created.

InsertText landed at the start of the file, so the vault copy reads `Gamma body from verify-traces# Verify Gamma`. That is recorded as a gotcha on the feature file. The create and disk write still happened through the window.
