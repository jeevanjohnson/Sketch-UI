# Repository conventions

The user chose this layout on 2026-10-23. Use coding-workflow for implementation and read ui-reference.md before UI changes. The application, executable and README use SketchUI. New files use .sketchui; legacy .sketchroom files remain readable.

## Layout

```text
agent-references/             Project guidance and verification
  GUIDE.md                   User and developer guide
  ui-reference.md            Visual and interaction decisions
  verification.md            Actual checks and limitations
  repository-conventions.md  This agreement
  README-comparison.md       Marked README rewrite
  reference-images/          Ignored supplied screenshots, kept locally
src/                         Application source and development tooling
  desktop/                   Electron main, preload and local model worker
  assets/                    Original SVG and generated PNG/ICO icons
  tests/                     Unit tests
  tools/                     Preview, icon generation and desktop checks
  *.mjs, *.html, *.css        Renderer and document model
  THIRD_PARTY_NOTICES.md      Notices included in the app
architecture/                Offline runtime explorer
  index.html
releases/                    Ignored generated installers/unpacked apps
  README.md                  Tracked build output instructions
README.md                    Public introduction and installation
package.json                 Root package/build manifest
package-lock.json            Locked dependencies
AGENTS.md                    Entry point for project instructions
.gitignore, .gitattributes   Git metadata
```

Root manifests and agent/Git configuration are necessary supporting files. Dependencies (`node_modules/`), verification output (`artifacts/`) and local agent research remain ignored. Existing old builds were moved into releases/release, releases/release-1.1 and releases/release-1.2 without removing their contents.

## README agreement

Use this order: Sketch UI title, logo, one-sentence description, Purpose, How to Install, Usecases, How to install (for devs). Keep user installation separate from development setup. Explain current SketchUI installer naming. Do not invent a public release URL, license or verified installer build. The clean README is at the root; a marked rewrite is in README-comparison.md.

## Source, generated output and dependencies

Track source, manifests/lockfile, SVG/PNG/ICO packaging icons, tests, tools, notices and project guidance. Ignore generated installers, unpacked applications, test artifacts, user .sketchroom projects, temporary files, local research and machine settings. Supplied reference images remain in ignored agent-references/reference-images/ because redistribution rights are unknown; their removal from the Git index was staged earlier and history still contains them.

No bundler or new dependency is introduced. Renderer imports remain relative inside src/. Electron's root package entry is src/desktop/main.cjs. Packaging includes runtime source, notices and assets from src/, excluding src/tests and src/tools. Production dependencies remain managed by electron-builder.

## Commands from the repository root

- `npm ci`: install locked dependencies.
- `npm start`: open the desktop app.
- `npm run preview`: serve src/ at 127.0.0.1:5173.
- `npm run check` and `npm test`: syntax and unit checks.
- `npm run icons`: rebuild PNG/ICO from src/assets/icon.svg using installed sharp.
- `node src/tools/verify-save.cjs`: native file lifecycle checks with controlled dialog responses.
- `node src/tools/verify-desktop.cjs`: broader editing/save/export checks.
- `node src/tools/verify-images.cjs`: image and automatic local cutout checks. Uses the original src/tests/fixtures/plant.svg image, which can be distributed with source.
- `node src/tools/verify-architecture.cjs`: explorer interaction checks.
- `npm run dist`: configured Windows x64 NSIS build to releases/; packaged executable releases/win-unpacked/SketchUI.exe. Release 1.3.0 build verification is recorded in verification.md.

Add `--packaged` to desktop/image checks to exercise a built executable. No automatic release or publish-on-push workflow is configured.

## Public release prerequisites

The user owns Git initialization, remote setup and visibility. Organization does not authorize commit, push or publication. Before a public release, use the selected AGPL-3.0-only license; review bundled dependency/model notices and source contents; choose version/tag, release destination and signing policy; then build and verify the packaged app, including offline image processing and native save behavior.

Use deploy only for an explicitly requested release with its concrete proposal. Publish installers as release assets, not source files. The published release is 1.3.0; version 1.3.1 is being prepared and is not yet published. Ordinary commit/push must not publish a release.
