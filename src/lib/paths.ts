// Re-export shared path utilities for the renderer (no duplicate logic).
export {
  normalizeRelativePath,
  basenameWithoutExt,
  dirnameRelative,
  noteTitleFromName,
  buildNewNotePath,
} from '../../shared/paths';