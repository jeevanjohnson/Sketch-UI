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

## 2026-10-23 — native project saving, icon and repository preparation

Implemented original editable SVG favicon with generated 256px PNG/ICO desktop assets. Electron window and Windows package configuration reference the icons; the preview server allows the SVG. Visually inspected icon and updated desktop toolbar screenshot.

Save (Ctrl+S) updates the current destination. First Save and Save As (Ctrl+Shift+S) create Documents/Sketchroom/<sanitized project name>/ and open a native save dialog there; another destination may be selected. Cancel may leave an empty default folder. Windows reserved device names are prefixed. Open validates content before adopting the selected path. New resets the active path. Temporary sibling-file write then rename protects the previous destination from write failure. Changes during a pending save remain dirty because only the captured snapshot is marked saved. Browser preview retains downloads; browser download completion is not confirmed.

Verified:
- `npm run check`: passed.
- `npm test`: 12/12 passed.
- `node tools/verify-save.cjs`: passed in Electron, real disk writes with controlled native dialog responses: automatic nested folder creation, same-file overwrite, shortcut Save/Save As, canceled Save As retains dirty state, Save As preserves original, native Open followed by Save, failed write retains dirty state and current target, New saves separately.
- `node tools/verify-desktop.cjs`: passed; editor, text, selection, clipboard, undo, project round-trip and PNG export; no renderer errors.
- `node tools/verify-images.cjs`: passed; native image clipboard, crop, color/automatic local background removal, embedded project round-trip and PNG export; no renderer errors.
- `node tools/verify-architecture.cjs`: passed in Electron; navigation, filtering and Save trace. Screenshot visually inspected. Default Playwright Chromium was unavailable; existing Electron was reused without another browser download.
- `git diff --check`: passed (Git reports line-ending conversion notices).

Focused review covered IPC sender checks, save destination ownership, snapshot/dirty tracking, cancellation, failure recovery, New/Open lifecycle, Windows path sanitization and packaging asset inclusion. No outstanding actionable defect found in that scope. Dialog responses are automated; manual OS dialog appearance/interaction and a rebuilt installed package were not checked. ICO executable resource application remains unverified until packaging; existing win.signAndEditExecutable=false is retained. No new installer, signing, release, network service or autosave was added.

Repository conventions are in docs/repository-conventions.md. Build output is configured as dist/. Source remains in its existing small layout; README comparison moved to docs/. Reference screenshots are locally retained and their removal from the Git index is staged (old Git history still contains them). No commit/push/publication occurred. License choice, dependency/license distribution review, release version/destination, signing policy and packaged smoke tests remain public-release prerequisites. Git status used a command-local safe.directory setting due to the existing ownership mismatch; global settings were untouched.

Architecture explorer: architecture/index.html, a compact accessible runtime list with drill-down evidence, filter, size control and Save trace. It documents the installed desktop boundary and browser alternative; it is not a live deployment certification.

## 2026-10-23 — user-selected repository layout and README

Moved application runtime code, assets, tests, tools and bundled notices into src/. Root package.json now points to src/desktop/main.cjs, and scripts use src/ paths. Renderer-relative imports and desktop preload/asset/notices paths remain valid. Packaging includes only runtime files/assets/notices under src/ and outputs to releases/. Existing release, release-1.1 and release-1.2 directories were moved intact under releases/ after checking source paths were inside the workspace. No builds were deleted.

Project guidance now lives in agent-references/. The offline runtime explorer lives in architecture/. Root AGENTS.md and repository-conventions.md were updated. Package manifests and Git metadata remain at root. Ignored local dependencies, research and test output remain separate. README.md now uses the requested Sketch UI title/logo/description and Purpose, How to Install, Usecases, and How to install (for devs) sections. Installed identity stays Sketchroom. The clean README is at root; README-comparison.md records marked changes against the saved pre-reorganization copy. Earlier verification entries above describe the paths at the time they were run.

Checks after relocation:
- npm run check: passed, including preload syntax.
- npm test: 12/12 passed.
- node src/tools/verify-save.cjs: passed native project file lifecycle.
- node src/tools/verify-desktop.cjs: passed editor/text/clipboard/save/PNG regressions with no renderer errors.
- node src/tools/verify-images.cjs: passed image/crop/local automatic cutout/project/export regressions with no renderer errors.
- node src/tools/verify-architecture.cjs: passed loading from architecture/, details, filter and Save trace.
- node src/tools/verify-preview.cjs: passed HTML, module and SVG favicon HTTP responses plus non-public file denial. Initial sandbox HTTP connection was denied (EACCES); rerunning the same check outside that restriction passed.
- git diff --check: passed with line-ending notices.

Focused review covered root entry point, runtime-relative paths, test imports, verification script launch roots, preview allowlist, packaging globs/icon/output settings, documentation links and ignored artifacts. No actionable defect remains in this relocation scope. No dependency versions changed, so package-lock.json did not need regeneration. Packaging has not been rerun; new installer behavior remains unverified. The image regression suite still uses a locally retained, untracked supplied screenshot, so a distributable test fixture is still needed before clean-clone public release validation. License, release destination and signing choices remain pending. No commit, push or publication occurred.

## 2026-10-23 — SketchUI 1.3.0 release preparation

The application, executable metadata/window branding, package identity and default project directory now consistently use SketchUI. App ID is local.sketchui.app. New saves use .sketchui; native Open accepts .sketchui and legacy .sketchroom, preserving the internal document/clipboard signatures. Existing Sketchroom installs/documents are retained; the new application identity can coexist with them. README now puts an agent setup prompt before manual developer instructions. Root AGPL-3.0-only LICENSE was copied from the installed upstream full license text; package metadata and bundled notices identify the public source repository and license. This license permits use/modification/commercial use/redistribution with corresponding-source requirements.

Replaced the private reference screenshot in image/model verification with an original distributable plant.svg fixture. The direct local model check measured 357172 transparent and 47583 opaque pixels at 736 × 552.

Final checks:
- npm run check and npm test: passed; 12/12 unit tests.
- Development verify-save, verify-desktop and verify-images: passed.
- Packaged verify-save --packaged: passed; SketchUI title/app name, .sketchui Save filter, automatic folders, overwrites, Save As/cancel, legacy .sketchroom Open/Save, failed-save state/target preservation, New destination reset.
- Packaged verify-desktop --packaged: passed editing, text, multi-selection, clipboard, undo, project round-trips and PNG exports; no renderer errors.
- Packaged verify-images --packaged: passed native image clipboard, crop, color removal, local model/cancellation, embedded-project round-trip and PNG export using the original fixture; no renderer errors.
- npm run dist: final NSIS Windows x64 build passed. Earlier intermediate builds were superseded after identity/filter/notices fixes; only the final artifact below is proposed.
- verify-package: all 17 packaged runtime/license assets byte-match source. Manifest name/version/main/license/productName and dependencies match; src/tests and src/tools are excluded.
- Windows executable ProductName/FileDescription = SketchUI; ProductVersion = 1.3.0.0. Extracted embedded icon visually inspected and matches the sketch/pencil design.
- Authenticode: application and installer are NotSigned. Builder's signtool log lines do not imply a valid certificate signature.

Installer: releases/SketchUI-Setup-1.3.0-x64.exe, 265023449 bytes.
SHA-256: a726bbec43ad7f86cef7b23e831fe6883d9a45633dd2cef21b6dd31ccc83e2b5.
Checksum asset: releases/SHA256SUMS.txt. Executable: releases/win-unpacked/SketchUI.exe.

Focused review found and fixed a native Save filter still using the old extension; the save suite now checks this filter. A test expectation was corrected after adding a separate legacy-file copy: the legacy copy is the active target while the original remains unchanged. ASAR extraction verification uses native Windows path separators for nested paths. Manual installer install/uninstall and certificate signing were not performed. Publication is pending approval of release-proposal-1.3.0.md. Repository is already public, remote/local main base is 850da93f6b47dfc72699b90638c747ac22a8a505, no preexisting outgoing commits/tags/releases were found. No commit, push, tag or release publication has been performed.

Final preview/explorer checks also passed after branding updates. The packaged Save UI screenshot was visually inspected: SketchUI wordmark and Save/Save As controls render correctly. README clean copy and marked comparison are current. Publication proposal is prepared for main / v1.3.0 with installer and SHA256SUMS assets; final approval is required by deploy workflow before further staging/commit/push/tag/release writes.
