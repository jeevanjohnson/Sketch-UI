# Publication proposal — SketchUI 1.3.0

Status: locally built and verified; not committed, tagged, pushed or published.

## Destination and source

- Public repository: https://github.com/jeevanjohnson/Sketch-UI
- Source/destination branch: main → origin/main.
- Current local and remote base: 850da93f6b47dfc72699b90638c747ac22a8a505 (init). No additional preexisting local commits would be pushed.
- Proposed new commit: release: prepare SketchUI 1.3.0
- Proposed new tag: v1.3.0 at that commit; tag and release do not currently exist.
- No local or tracked-at-base GitHub workflows exist; no publish-on-push pipeline is configured.

## Included changes

All current task changes: src/ relocation and root build configuration, agent-references/ documentation, architecture/ explorer, releases/README.md, original icon assets, native Save/Save As/Open lifecycle, SketchUI branding and .sketchui extension with legacy compatibility, version/manifests/lockfile, AGPL LICENSE/notices, tests and tooling, README setup prompt and manual installation. Includes removal from tracking of the two reference screenshots while retaining them locally; existing history is preserved.

Source files, tests, fixtures, docs, package manifests, LICENSE and Git rules will be committed. Dependencies, user projects, historical builds, generated installers, test artifacts, private reference images and local agent research remain ignored.

## Release

- Title: SketchUI 1.3.0
- Tag: v1.3.0; regular public latest release, not a prerelease.
- Notes: release-notes-1.3.0.md.
- Assets: releases/SketchUI-Setup-1.3.0-x64.exe (265023449 bytes), releases/SHA256SUMS.txt.
- Installer SHA-256: a726bbec43ad7f86cef7b23e831fe6883d9a45633dd2cef21b6dd31ccc83e2b5
- Target: Windows x64; unsigned NSIS installer. Installed program: SketchUI.exe.
- GitHub-generated source archives will correspond to the same tagged commit.

## Validation and limits

Syntax and 12 unit tests passed. Development and packaged save/editor/image suites passed, including legacy file compatibility and offline model processing. Original image fixture/model alpha check passed. All 17 packaged runtime/license assets, manifest identity and dependencies matched source; developer tools/tests are excluded from the app. Executable ProductName/FileDescription are SketchUI, version 1.3.0.0, and the embedded icon was inspected. Installer compiled successfully and Authenticode reports NotSigned. No manual install/uninstall was performed. Source review and whitespace checks are recorded in verification.md.

## Publication approval

Approval authorizes committing this reviewed state, pushing main, creating/pushing v1.3.0, and publishing the release notes plus the installer/checksum assets above to this repository. Recheck working tree, remote branch/tag state and artifact hashes immediately before execution. No history rewrite, force push, remote visibility change or replacement of existing releases is included.
