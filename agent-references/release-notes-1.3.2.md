# SketchUI 1.3.2

This patch fixes save and export edge cases and improves source maintainability.

- Finish inline text editing when saving so the saved edit can be undone.
- Preserve the original PNG dimensions and filename when switching pages during export.
- Separate document validation into focused helpers and calculate selection bounds in one pass.
- Centralize desktop input guards and provide cleanup functions for event subscriptions.
- Add validation, event cleanup, Save/Undo and delayed-export regression checks; make dialog tests wait for completed state changes.
- Respect checkout line endings in formatting checks.

## Windows download and compatibility

Install SketchUI-Setup-1.3.2-x64.exe; SHA256SUMS-1.3.2.txt accompanies it. The installer remains unsigned. Existing .sketchui and legacy .sketchroom documents remain compatible; no migration is required. Saving, image processing and export continue to run offline.

## Dependency limitation

Dependency versions are unchanged. npm audit reports a high-severity oversized-collection memory exhaustion advisory for Zod, propagated through the local background-removal library (GHSA-mrhx-c7xc-m3w5). Applicability to this application's bundled local-model use has not been established. The suggested library downgrade is a breaking dependency change and is not included in this patch.

## Source and verification

Source archives will correspond to v1.3.2 in https://github.com/jeevanjohnson/Sketch-UI. Validation results and the installer checksum are recorded in the release proposal and project verification record. Manual installer install/uninstall is not tested.

Final validation: 17 unit tests and source checks passed. Packaged native saving, editing, clipboard, crop, offline automatic cutout/cancellation, project round-trip and PNG export passed with no renderer errors. All 18 runtime/license assets match source; Windows x64 native Sharp binary verified. Installer SHA-256: 0bf2c3c4f707db24ab7e584e336e471b169a9ef45d7d8060eb75e9d65e7fc327.
