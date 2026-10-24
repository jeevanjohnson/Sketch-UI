# SketchUI 1.3.1

This patch improves drawing reliability and source maintainability while preserving the offline workflow and editable project format.

- Keep the size and direction of arrows and lines drawn upward or to the left.
- Release image data from discarded undo history instead of retaining it for the entire editing session.
- Reject malformed object names and flags when opening projects, with clearer errors for invalid page/object records.
- Share focused SVG rendering helpers between the editor and PNG export.
- Apply consistent source formatting and add repeatable formatting checks for contributors.
- Strengthen regression checks for drawing, image history, and save completion.

## Windows download

Run SketchUI-Setup-1.3.1-x64.exe to install the Windows x64 app. The installer is unsigned, as in 1.3.0. SHA256SUMS-1.3.1.txt accompanies the installer.

SHA-256: ed8aea14aca26636d8ca655d9e64beccff36dc535bd0ce41dd23e3a18abac084

## Upgrade

Existing .sketchui and legacy .sketchroom files remain compatible. No project migration is required. Local saving, cropping, image background removal and PNG export continue to work offline.

## Source

Source archives correspond to tag v1.3.1 in https://github.com/jeevanjohnson/Sketch-UI. Build instructions, locked dependencies, the AGPL-3.0-only license and third-party notices remain included.

## Validation

Syntax checks and 15 unit tests passed. The packaged Windows app passed native save/Save As/Open, editing, reverse-direction arrows, clipboard, project round-trip, crop, PNG export and offline automatic background-removal checks. All 18 packaged runtime/license assets and package identity/dependencies matched source. Executable metadata reports SketchUI 1.3.1. Installer compilation passed; manual install/uninstall was not performed.
