# Third-party software

Sketchroom's automatic local subject extraction uses @imgly/background-removal-node 1.4.5 by IMG.LY GmbH (https://github.com/imgly/background-removal-js), licensed under GNU Affero General Public License v3. Its complete license and upstream ThirdPartyLicenses.json are retained in the installed package. The package's bundled small/medium ONNX resources are retained alongside its runtime. The original package is unmodified; patched compatible dependency versions are selected through npm overrides.

The local implementation source is supplied in this project, including desktop/background-worker.cjs and package-lock.json. No upload service or remote model download is used by the app. The application credits dialog displays the upstream license text. This private local build does not publish the project or its source to any service.

Other runtime dependencies include Electron (MIT), onnxruntime-node (MIT), sharp (Apache-2.0, with separately licensed bundled libraries), lodash (MIT), ndarray (MIT), and zod (MIT). Their upstream licenses/notices remain in the packaged node_modules directories. Development tools include electron-builder and Playwright. See package-lock.json for exact installed versions and package metadata. No fonts or artwork from the reference screenshots are redistributed; the shell uses Windows system fonts and original vector decoration.
