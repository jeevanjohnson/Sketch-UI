# Publication proposal — SketchUI 1.3.2

Status: installer verified; source commit/push authorized; tag and release publication await final confirmation under project instructions.

## Destination and source

Repository: https://github.com/jeevanjohnson/Sketch-UI. Branch main -> origin/main, base f2ac263c600bbf746a3d25d460d1281c71793244. No existing outgoing commits; remote base matched and v1.3.2 was absent during preparation. Previous release v1.3.1 corresponds to ffdc345e578c7e8673950909989a54d0e05976ab; f2ac263 records that publication. Proposed source commit subject: release: prepare SketchUI 1.3.2. The new release commit will contain the current quality revision, 1.3.2 metadata and release documentation; its hash is reported after committing.

Tag v1.3.2 must point to that exact source commit. No GitHub workflow/push-triggered publisher is configured. The GitHub connector lacks release-upload operations; use the established Git/GitHub REST credential-manager workflow without logging secrets. Reinspect remote branch/tag/release state before publication. Do not overwrite an existing tag, asset or release or force-push.

## Exact release payload

Title SketchUI 1.3.2; regular latest release, not a prerelease. Notes: release-notes-1.3.2.md.

- Windows x64 NSIS installer: releases/SketchUI-Setup-1.3.2-x64.exe, 270514711 bytes.
- SHA-256: 0bf2c3c4f707db24ab7e584e336e471b169a9ef45d7d8060eb75e9d65e7fc327.
- Checksum asset: releases/SHA256SUMS-1.3.2.txt.
- Executable: releases/win-unpacked/SketchUI.exe. ProductName/FileDescription SketchUI; ProductVersion 1.3.2.0; FileVersion 1.3.2.
- Application and installer Authenticode status: NotSigned.

Upload only installer and checksum. Leave unpacked output, model/package archives, blockmaps, test artifacts and supplied references local. GitHub-generated source archives must correspond to v1.3.2.

## Included changes and checks

Fix inline-text Save/Undo and preserve original PNG metadata during asynchronous export; refactor validation and bounds; centralize desktop input guards; add event-subscription cleanup. Add regressions and robust asynchronous dialog/copy waits. Add native x64 Sharp verification and documented ARM64-host/x64-target build preparation. Preserve dependency versions, offline runtime, project format, UI, license and installer options.

Final build passed using locked electron-builder 26.15.3. All installed package versions and the added x64 native package archive integrity match package-lock.json. All 18 packaged runtime/license assets and manifest identity/dependencies match source; development files excluded; native Sharp PE machine verified x64. Packaged Save, desktop and image suites passed, including bundled offline model/cancellation and PNG tests. Syntax, 17 unit tests, pinned formatting and whitespace checks passed. No renderer errors. Manual install/uninstall was not performed. Reverify package/source match and installer checksum after the source commit and before publication.

Known dependency limitation: npm audit reports high severity GHSA-mrhx-c7xc-m3w5 for Zod through the cutout library. No forced breaking downgrade is included; exploitability in this bundled local-model configuration is unestablished. Disclosed in release notes.

## Confirmation scope

Approve creating/pushing annotated v1.3.2 at the verified source commit, creating a GitHub draft release, uploading/verifying the two named assets, then publishing as latest. Source commit/push is separately authorized by the user's push request. Publication verification must confirm remote commit/tag, notes, uploaded byte lengths/digests and latest-release status. Existing 1.3.1 release remains latest until then.
