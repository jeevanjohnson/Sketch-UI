# SketchUI

An offline Windows sketchbook for interface ideas. Mix freehand marks, editable UI blocks, shapes, text, and annotations, then export a PNG for a design conversation.

## Open the app

Run `releases/SketchUI Setup 1.3.0.exe` for the installer and desktop shortcut, or open `releases/win-unpacked/SketchUI.exe` directly. Save your project file before switching from an older running version. Existing version 1 project files open in this version. New projects containing images require version 1.2 or newer. The installer is unsigned. No account or network connection is needed to use the installed app, including automatic image cutouts.

## Develop

Requires Node.js 22.12 or later on Windows. Dependencies are isolated in this directory and locked in `package-lock.json`.

```powershell
npm ci
npx install-electron --no
npm start
```

The first installation downloads tools and local model files through npm. `npm run preview` serves a browser preview at http://127.0.0.1:5173. `npm run dist` builds the Windows installer in `releases/`. `npm run check` checks JavaScript syntax; `npm test` runs document-model, image-processing, and text-layout tests. `node src/tools/verify-desktop.cjs` runs desktop editing checks, `node src/tools/verify-images.cjs` checks image clipboard/crop/cutout/save/export, and `node src/tools/verify-background.cjs` directly checks the bundled model. Add `--packaged` to either desktop suite to test the built executable. The browser preview supports cropping and plain-color removal; automatic photo cutouts use the desktop app's bundled native runtime.

## Use

- Pick a tool or library component. Drag on the white page to draw; tools stay active after each stroke. Press V or choose Select when done. Click a library piece to insert it in the visible area.
- Select and drag objects, use corner handles to resize, or enter exact geometry in the inspector. Shift-click or Ctrl-click toggles objects in selection. Drag blank space to select an area. Ctrl+C and Ctrl+V copy/paste editable objects, including across pages; text fields retain normal text copy/paste.
- With Select active, double-click text, a rectangle, a circle, or a note to type directly on the canvas. Enter adds a line; Ctrl+Enter or clicking outside finishes; Escape reverts that text edit. Text wraps to the box width. Standalone text grows vertically by default; turn off automatic height in the inspector to keep it fixed.
- Text inside shapes has horizontal/vertical alignment, padding, size, and color controls. Shape dimensions stay fixed; overflowing text is clipped and the inspector reports overflow. Enlarge the shape or reduce text size/padding to fit more text.
- Library pieces stay grouped while editing: double-click their labels, use Component text fields, or select a part in the inspector. Alt-click also selects a single part for geometry/color edits. Ungroup remains available but is optional.
- Group and arrange from the inspector. Aligning a single group aligns it to the page; multiple selected groups align relative to their combined bounds.
- Add named desktop, phone, tablet, or custom pages. Pages and layers are in the sidebars.
- Save (Ctrl+S) writes an editable `.sketchui` file and updates that file on later saves. Save As (Ctrl+Shift+S) creates a separate copy through a native dialog. The app creates Documents/SketchUI/<project name>/ as the default folder. Open remembers the chosen file for later saves. The browser preview downloads project files instead. There is no persistent autosave: keep the project file. Closing warns about unsaved work.
- Export PNG downloads only the current page at 1× or 2×. Notes and annotation arrows can be excluded. Guides, selection handles, editor controls, and the blue stage are excluded.
- Pan with Space-drag or the hand tool; Ctrl+wheel zooms at the pointer. The help button lists shortcuts.

## Images

Paste an image with Ctrl+V, drop a file onto the canvas, or choose Add an image. PNG, JPEG, WebP, GIF (one frame), and BMP are normalized into embedded PNGs; imports are limited to 20 MB, downscaled to 4096px per side / 12 megapixels, and embedded images are limited to about 18 MB of binary PNG data. Project files can be up to 100 MB. Image data is stored inside the project, not as a link to your original file. History shares image assets instead of storing the full PNG again for each edit.

Double-click an image with Select active, or choose Crop / remove background in its inspector. Drag a crop rectangle or enter percent bounds. Reset crop reveals the original image. Cropping is nondestructive and undoable; it trims the displayed frame while keeping its scale and original pixels. The image editor uses a checkerboard to show transparency.

For logos and plain backgrounds, sample a color or set it with the color picker, adjust tolerance, and preview color removal. The default removes matching regions connected to the image border or sampled point; uncheck that option to remove enclosed matching regions too. For photo subjects, choose Remove background locally. The bundled medium IMG.LY model processes the image on your CPU; no image is uploaded and no model download occurs during use. Cancel stops processing. Subject cutouts can be imperfect on fine hair, shadows, transparency, or unusual subjects; inspect the preview before applying. Restore original pixels reverses prior background removal. Cancel discards the dialog's changes; Apply commits them together as an undo step.

Ctrl+C on a selected image copies both a native bitmap for other apps and its editable SketchUI representation. Copy image to clipboard copies only the visible cropped bitmap. Pasting within a text field retains normal text-paste behavior. Cropped/transparent images are included in PNG exports. Source files on disk are never edited.

For the later AI workflow, supply the exported PNG to `/ui-reference` along with your intent, behavior notes, and any additional examples. The app itself does not call an AI service.

## Design and implementation

Read [ui-reference.md](ui-reference.md) before changing the interface. The Isekai screenshot governs colors, type, and aesthetic; the ramen screenshot supplies layout guidance. Reference images remain locally in `agent-references/reference-images/` (ignored by Git). The editor uses Windows system fonts and original vector cloud accents.

`src/model.mjs` owns the document format/history; `src/text-layout.mjs` shares SVG/export wrapping; `src/image-editor.mjs` owns image import/crop/editing; `src/image-processing.mjs` and its worker handle plain-background removal; `src/desktop/background-worker.cjs` runs the bundled model. Native packages/models are bundled and unpacked where required. There are no runtime remote fonts, analytics, image uploads, or network services. Dependency overrides select patched sharp/lodash/zod versions; the lockfile records exact versions. Credits displays upstream notices and the model library's license; see [THIRD_PARTY_NOTICES.md](../src/THIRD_PARTY_NOTICES.md). Verification and limitations are recorded in `verification.md`.
