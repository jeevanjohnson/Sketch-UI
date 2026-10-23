# Verification

## Version 1.2 — images and Isekai design correction

The user's correction makes Isekai the authority for palette, lettering and atmosphere; ramen remains layout guidance. Implemented cobalt/midnight/blue-white panels, thin outlined wordmark, Windows Segoe Print display headings, pale blue actions, fine light outlines and original vector cloud accents. Existing page content/colors are not recolored. Opened and inspected `artifacts/editor-isekai-images.png` and the image-editor preview screenshots; the updated shell follows the new source hierarchy rather than the superseded cream/red rules.

Twelve unit tests pass. New tests cover alpha-preserving plain-color removal, connected versus enclosed colors, crop bounds, embedded-image validation, and image-history asset sharing. `npm run check` covers renderer/image modules and desktop worker syntax. Old projects still validate. New image objects require version 1.2 or newer to open; document format version stays 1 with an additional supported object type.

Both `node tools/verify-desktop.cjs --packaged` and `node tools/verify-images.cjs --packaged` passed against `release-1.2/win-unpacked/Sketchroom.exe`. This covers the previous drawing/text/group/selection workflows plus native bitmap clipboard paste, copying both native PNG and editable object data, object paste, nondestructive crop, crop undo/redo, plain-background worker processing with measured transparent/opaque pixels, local automatic cutout, cancel/retry of the model worker, credits/license loading, embedded image project save/reopen, and PNG export. No renderer errors observed. `artifacts/images-roundtrip.sketchroom` and `artifacts/images-export.png` are generated test fixtures, not user projects. Opened the exported PNG and confirmed embedded/cropped/transparent images render in it. Also opened the clean initial `artifacts/editor-desktop.png` after the packaged regression run to inspect the final theme without test-image overlays.

Direct local model verification (`node tools/verify-background.cjs`) succeeded under the restricted environment, with no network access needed: 736 × 552 PNG, 360587 transparent and 19463 opaque pixels. Packaged-app cutout verification also succeeded with local resources. The model was tested on the supplied ramen graphic, not an exhaustive photo dataset; exact subject quality remains image-dependent. The user-facing preview notes difficulties with hair, shadows and transparency and allows cancel/restore. Plain removal uses a user-picked color, tolerance, edge/sample-connected flood fill or all-matching-color mode, with softened alpha.

The installer `release-1.2/Sketchroom Setup 1.2.0.exe` was built successfully (265026893 bytes, approximately 265 MB) with model resources/native runtimes unpacked alongside the app where needed. Automatic removal uses @imgly/background-removal-node 1.4.5 with bundled medium model in a cancelable worker. Inspected installed package code, resource manifest, declarations and docs; retained relevant code/docs under `.git-context/imgly-background-removal/`. Upstream notices/license remain bundled and are accessible through Credits. Patched overrides select sharp 0.35.5, lodash 4.18.1 and zod 3.25.76; npm installation audit reported zero known vulnerabilities after these updates.

Image imports normalize supported formats to PNG, downscale to 4096px per side / 12 megapixels, and preserve originals for reversible edits. Import file limit: 20 MB; embedded PNG string limit: 24 million characters; project limit: 100 MB. Model work runs in a native worker; color processing in a web worker. History interns image assets to avoid duplicating PNG data across every snapshot. Original source files and the user's running older app were not altered. The installer wizard remains untested, and this unsigned build retains the default Electron executable icon. No full accessibility audit or general photo-quality benchmark is claimed. Browser preview lacks native automatic-cutout capability; desktop build includes it offline.

## Version 1.1 feedback update

Eight model/text-layout tests pass, including old-project compatibility, new formatting validation, word wrapping and long-word splitting, explicit blank lines, padding/center geometry, and overflow reporting. Syntax checks pass.

Extended the existing Electron suite to exercise the user's requested behaviors: two pen strokes with the tool still active; direct canvas editing of rectangle/circle labels and standalone text; Ctrl+Enter commit and Escape rollback; automatic wrapping into multiple SVG lines; horizontal centering and 24px padding; Ctrl and Shift multi-selection; dragging selected shapes together; actual Ctrl+C/Ctrl+V and paste undo; grouped checkbox label editing both directly and through the inspector; selecting individual group parts; PNG export and file save/reopen retaining embedded text and formatting. The complete suite passed against the final packaged `release-1.1/win-unpacked/Sketchroom.exe` with no renderer errors. `npm run dist` completed and created `release-1.1/Sketchroom Setup 1.1.0.exe`; the installer wizard itself was not run.

Opened `artifacts/editor-text-features.png`, `artifacts/editor-inline-text.png`, and `artifacts/export-text-features.png`: direct editing overlays the actual shape, centered labels render within shapes, standalone text wraps downward, and edited component labels appear in exported artwork. Text in fixed shapes is clipped to its padded boundary; text boxes auto-grow by default and can opt into fixed height. New optional fields preserve compatibility with version 1 files. The existing visual styling is retained.

Build output is isolated in `release-1.1/` to avoid overwriting or stopping the user's running version. Save current work to a project file before switching versions. No user project files were opened, overwritten, or modified during testing; all fixtures are generated inside `artifacts/`.

The original verification record follows for historical context.

Verified 2026-10-22 on Windows x64 using Node 24.14.1, Electron 45.0.0, electron-builder 26.15.3, and Playwright 1.64.1. Versions are locked in package-lock.json.

## Passed

- `npm run check`: JavaScript syntax checks for renderer, model, and desktop main process.
- `npm test`: five document-model tests covering complete JSON round-trip, invalid geometry/colors/format rejection, undo/redo branching, grouped resizing, and reverse-direction line bounds.
- `node tools/verify-desktop.cjs`: real Electron window, editable card insertion, undo and redo, ungrouping and text edit, pointer-drawn rectangle, phone page creation, geometry edits, freehand stroke and undo, actual native PNG and project downloads, project reload, malformed project recovery, annotation-free export, and no observed renderer errors.
- Exported phone PNG checked for PNG signature and exact 390 × 844 pixel dimensions. Opened and visually inspected `artifacts/export-phone.png`.
- Export without annotations checked at the original note location: white pixels replace its yellow background. Output `artifacts/export-no-annotations.png`.
- Captured and opened `artifacts/editor-desktop.png` (1464 × 901 content area) and `artifacts/editor-minimum.png` (1084 × 681 content area, Windows outer window 1100 × 720). No horizontal document overflow. Sidebars scroll, controls remain present, page fits on resize.
- `npm run dist`: Windows x64 NSIS installer generated at `release/Sketchroom Setup 1.0.0.exe`. Unpacked application at `release/win-unpacked/Sketchroom.exe`.
- Dependency installation audit reported zero vulnerabilities at installation time.

## Reference fidelity

Compared the rendered wordmark, primary export button, cream side panels, nested perimeter frame, and cobalt stage against the saved source images. The narrow heavy wordmark and expressive sidebar heading preserve type contrast; the red primary button preserves the source's offset line treatment; panel borders retain the ramen reference's restrained ink construction. Cobalt stage and dot texture adopt the second image's atmosphere without copying its artwork. White artwork pages are a deliberate neutral export surface. Original fonts and artwork were not reused. The screenshot does not prove the original source's CSS, library, or interactions.

## Limits and deliberate choices

- Installer and app are unsigned and use the default Electron executable icon. The installer was built, but the installer wizard was not run on the user's computer. Both the development entry point and the final packaged `release/win-unpacked/Sketchroom.exe` passed the desktop interaction suite (`node tools/verify-desktop.cjs --packaged`).
- No full screen-reader or exhaustive keyboard/contrast audit; native labeled controls and focus styles are implemented. The canvas is a visual editing surface, with layers and numeric inspector as alternative controls.
- Alignment, layering, grouping, pan/zoom, and outline switching have implementation coverage but not every pointer/key combination was automated. No claim of exhaustive test coverage.
- No mobile editor target. Minimum desktop window is 1100 × 720 with independently scrollable sidebars. Browser preview below 1000px intentionally scrolls horizontally.
- No persistent autosave or temporary crash recovery. Desktop close warning and native download completion tracking are implemented; browser preview cannot confirm the user's final download destination.
- Exports are raster PNGs of the current page only. No direct AI calls, cloud sync, SVG export, project collaboration, or image upload tool.
- Runtime has no remote resources. Initial developer setup and installer construction require internet downloads. Automated tests did not emulate every network failure or an offline OS session.

## Resolved verification issues

Sandbox DNS blocked initial npm/runtime/build downloads; approved network execution completed them. The Electron launch also required execution outside the sandbox. An early harness expected redo to retain selection; it now explicitly selects the restored object. Electron native downloads use `will-download`, so the harness was corrected from browser download events. These were tooling issues, not silently recorded as product test passes.

Visual review prompted automatic canvas fitting on window resize. Native download completion now controls the saved state so canceled/interrupted project downloads remain unsaved. The final installer is rebuilt after renderer/shell changes.
