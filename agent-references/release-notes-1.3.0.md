# SketchUI 1.3.0

An offline Windows interface sketchbook, now with consistent SketchUI branding and a simpler project-saving workflow.

- Save updates the current file; Save As creates a separate copy.
- New saves default to an automatically created Documents/SketchUI/project-name folder. New files use .sketchui; legacy .sketchroom projects remain readable.
- Original blue sketch-and-pencil favicon, window icon and Windows executable icon.
- Consistent SketchUI application, executable and installer naming.
- README setup prompt for agents followed by manual developer instructions.
- Source organized into agent-references/, src/, architecture/ and releases/.
- AGPL-3.0-only license with bundled third-party notices, plus an original distributable image-test fixture.

## Windows download

Run SketchUI-Setup-1.3.0-x64.exe to install the Windows x64 app and create its desktop shortcut. The executable is SketchUI.exe. The installer is unsigned; Windows may display a publisher/reputation warning.

SHA-256: a726bbec43ad7f86cef7b23e831fe6883d9a45633dd2cef21b6dd31ccc83e2b5

## Upgrade

SketchUI uses a new application identity and may be installed alongside older Sketchroom builds. Existing files in Documents/Sketchroom are retained. Open an old .sketchroom file in SketchUI and use Save As to create a .sketchui copy in Documents/SketchUI. No projects are migrated or deleted automatically.

Internal document/clipboard identifiers remain compatible with earlier versions. No autosave, account or cloud service is added.

## Source and license

Use the source archive for tag v1.3.0 at https://github.com/jeevanjohnson/Sketch-UI. Build instructions and locked dependencies are included. AGPL-3.0 permits use, modification, commercial use and redistribution subject to source-sharing requirements; third-party software retains its notices.

## Validation

Syntax checks and 12 unit tests passed. Development and packaged Windows executables passed native saving, legacy file opening, editing, clipboard, image/crop, PNG export and offline automatic background-removal checks. All packaged runtime/license assets matched the reviewed source, and executable metadata/icon were verified. Installer compilation passed; a manual install/uninstall was not performed.
