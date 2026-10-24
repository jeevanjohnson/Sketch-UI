# Publication proposal — SketchUI 1.3.1

Status: approved by the user and published on 2026-10-24. Release: https://github.com/jeevanjohnson/Sketch-UI/releases/tag/v1.3.1. Source commit: ffdc345e578c7e8673950909989a54d0e05976ab; annotated tag: v1.3.1. The preparation details below are retained as the approved publication record.

## Destination and source

- Repository: https://github.com/jeevanjohnson/Sketch-UI
- Source/destination: main → origin/main, currently 09968f59848513df2dd8f075ccb340d3349fcfb5 locally and remotely.
- Previous release: v1.3.0 at b74981cc65ce79adf7d5d2709c68aa2b523d84a0.
- Changes since that release: befeb83 (publication record), 09968f5 (review fixes, renderer separation and formatting), plus the prepared 1.3.1 metadata/documentation changes.
- Proposed new commit: release: prepare SketchUI 1.3.1.
- Proposed new annotated tag: v1.3.1 at that release commit. Remote tag absent at preparation; recheck before publishing.
- No configured GitHub workflow or publish-on-push pipeline exists. The GitHub connector has no release/asset upload operations; reuse Git/GitHub REST with the configured credential manager, without logging credentials.

## Release and assets

- Title: SketchUI 1.3.1; regular latest release, not a prerelease.
- Notes: agent-references/release-notes-1.3.1.md, covering actual changes and compatibility.
- Windows x64 NSIS installer: releases/SketchUI-Setup-1.3.1-x64.exe, 265026441 bytes.
- Installer SHA-256: ed8aea14aca26636d8ca655d9e64beccff36dc535bd0ce41dd23e3a18abac084.
- Checksum asset: releases/SHA256SUMS-1.3.1.txt.
- Executable: releases/win-unpacked/SketchUI.exe, ProductName/FileDescription SketchUI, ProductVersion 1.3.1.0, FileVersion 1.3.1.
- Both executable and installer report NotSigned. No change in signing policy is proposed.
- Upload only installer and checksum assets. GitHub-generated source archives will correspond to v1.3.1. Do not upload blockmaps, unpacked output, dependencies, test artifacts or reference images.

## Included source changes

Version 1.3.1 in package.json and the two root package-lock version fields; README installer names and its marked comparison; release notes, this proposal and verification record; release/repository status documentation. No dependency versions, license, runtime communication paths, project format, target platform or installer options change during preparation. Existing .sketchui and .sketchroom files remain compatible.

## Verification

The real npm run dist Windows build passed. Syntax and 15 unit tests passed on the versioned source. Packaged verify-package compared all 18 runtime/license assets byte-for-byte and checked identity/dependencies and exclusion of development files. Packaged verify-save, verify-desktop and verify-images passed native file lifecycle, editing, reverse-arrow, clipboard, undo, crop, local automatic cutout, project round-trip and PNG export checks; no renderer errors. Executable metadata and unsigned status were checked. Manual installer install/uninstall was not performed. The source runtime inputs and manifest metadata must be rechecked against the release commit before publication.

## Confirmation scope

Confirmation authorizes committing only the prepared release changes, pushing main, creating/pushing v1.3.1, creating a draft release, uploading/verifying the two assets, and publishing it as latest. Do not overwrite any existing release/tag/asset or force-push. Recheck remote state and hashes before writes. Record the final source commit, tag and release URL after publication.
