# Tooling

- `npm run icons`: rebuild src/assets/icon.png and src/assets/icon.ico from src/assets/icon.svg using installed sharp; assets are tracked packaging inputs. Generated files visually checked.
- `node src/tools/verify-save.cjs`: launches development Electron and checks file lifecycle with controlled dialog replies and real writes under ignored artifacts/save-flow. Passed; does not verify manual dialog interaction.
- `node src/tools/verify-architecture.cjs`: reuses Electron to inspect the offline explorer and saves artifacts/architecture.png. Passed.
- `node src/tools/verify-desktop.cjs` and `node src/tools/verify-images.cjs`: broader desktop checks; `--packaged` uses releases/win-unpacked/SketchUI.exe after a local build. Development checks passed; new packaged output not tested.
- `node src/tools/verify-background.cjs`: direct local model check (not rerun separately; image suite exercised automatic cutout).

- `node src/tools/verify-preview.cjs`: starts the local preview server, checks HTML/module/favicon responses and denial of non-public paths, then stops the server. Passed outside the localhost-restricted sandbox.

- `node src/tools/verify-package.cjs`: compares packaged runtime/assets/notices/LICENSE and manifest identity/dependencies with source, excludes development files; passed for 1.3.0.
- `node src/tools/compare-readme.cjs before.md after.md comparison.md`: writes a line-based Markdown comparison (strikeout removals, bold additions). Uses Node only; intended for small README-sized inputs; generated release comparison inspected.
