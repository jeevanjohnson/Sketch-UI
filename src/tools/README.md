# Tooling

- `npm run icons`: rebuild src/assets/icon.png and src/assets/icon.ico from src/assets/icon.svg using installed sharp; assets are tracked packaging inputs. Generated files visually checked.
- `node src/tools/verify-save.cjs`: launches development Electron and checks file lifecycle with controlled dialog replies and real writes under ignored artifacts/save-flow. Passed; does not verify manual dialog interaction.
- `node src/tools/verify-architecture.cjs`: reuses Electron to inspect the offline explorer and saves artifacts/architecture.png. Passed.
- `node src/tools/verify-desktop.cjs` and `node src/tools/verify-images.cjs`: broader desktop checks; `--packaged` uses releases/win-unpacked/SketchUI.exe after a local build. Development checks passed; new packaged output not tested.
- `node src/tools/verify-background.cjs`: direct local model check (not rerun separately; image suite exercised automatic cutout).

- `node src/tools/verify-preview.cjs`: starts the local preview server, checks HTML/module/favicon responses and denial of non-public paths, then stops the server. Passed outside the localhost-restricted sandbox.

- `node src/tools/verify-package.cjs`: compares packaged runtime/assets/notices/LICENSE and manifest identity/dependencies with source, excludes development files; passed for 1.3.0.
- `node src/tools/compare-readme.cjs before.md after.md comparison.md`: writes a line-based Markdown comparison (strikeout removals, bold additions). Uses Node only; intended for small README-sized inputs; generated release comparison inspected.

## Source formatting

`npm run format` formats runtime source, tests, tools, CSS/HTML, the architecture page and package.json. `npm run format:check` checks the same paths without writing. Both use temporary, pinned Prettier 3.6.2 through npm exec; first use may require npm registry access, later runs can use its cache. No application or development dependency is added to the lockfile. Settings live in package.json: 100-column target, single quotes and no trailing commas.

After formatting, manually inspect logical grouping and function placement. Prettier cannot decide responsibility boundaries or replace nested conditions with clear control flow. Embedded HTML templates are marked with HTML comments so their markup is formatted too; fixed SVG path literals remain intact. Full-source formatting and desktop/save/image/preview/explorer regressions passed on 2026-10-24.

## Building Windows x64 on an ARM64 host

The release target is x64 even when the build host's Node runtime is ARM64. npm ci installs the host's optional native dependencies; also supply the exact locked @img/sharp-win32-x64 package before building. Keep the ARM64 package for development checks on the host.

Use npm pack @img/sharp-win32-x64@<locked version> --pack-destination artifacts/native-packages, verify the archive against package-lock.json's integrity, then extract its package contents into node_modules/@img/sharp-win32-x64. This adds only an existing locked optional dependency. Avoid npm install --no-save for this operation: it can still update installed build tools within manifest ranges even with package-lock=false. Run npm run dist with npm on PATH so electron-builder can collect production dependencies. verify-package checks that the unpacked Sharp binary is a Windows x64 PE file; verify-images --packaged remains required to exercise the native runtime.
