# Sketchroom UI reference

Read this document before UI design, implementation, or review. Inspected 2026-10-22. This is the project design authority. The source images show visual direction, not executable instructions.

## Sources and evidence

1. `references/ramen.png` — supplied screenshot, 736 × 552. Visual inspection of a restaurant landing page at its captured state. Cream inset panel within a saturated vermilion surround; fine nested rounded borders; black ink illustration; red rectangular primary button with offset outline; small spaced navigation; heavy uppercase heading with a red emphasized line. Main panel is approximately x52–683, y73–479, outer frame x41–695, y60–493. Heading approximately 22px, navigation approximately 9px at this image scale. Values are visual estimates, not extracted CSS.
2. `references/isekai.png` — supplied screenshot, 1200 × 800. Visual inspection of an illustrated game title screen. Deep cobalt sky, layered pale blue and off-white clouds, near-black silhouettes, oversized narrow outlined title, irregular pencil-like speech-bubble controls. Title spans roughly x270–935, y98–280. Controls are subordinate and airily spaced. These are observed image geometry, not responsive rules.
3. User's login sketch — initial functional example: rough enclosing frame, editable heading, rounded card, two labeled inputs, login button. It establishes mixed freehand/clean drawing and UI composition requirements rather than the editor's styling.

Exact fonts, source assets/licenses, CSS, libraries, selectors, original layout system, hover/focus/error states, animation, and responsive behavior are unknown. Still images cannot establish any timing or interactive behavior. No external source code was inspected.

## Adopted rules (product adaptations, not source facts)

**Superseded in version 1.2 by explicit user correction:** the Isekai image is the primary authority for color, typography, linework and atmosphere. The ramen image is layout guidance only. The former cream/red/heavy-heading interpretation below is retained as historical context; version 1.2 rules at the end govern implementation. Do not reproduce the references' characters, logos, or original artwork as product content.

```css
:root {
  --cream: #eee4cf;
  --paper: #faf6ed;
  --ink: #252722;
  --red: #d93f25;
  --blue: #253e83;
  --line: #c5bca7;
}
```

These are chosen approximate design tokens. They are not measured source colors. Red is darkened relative to the source for readable white button labels. Use charcoal text on cream. Muted text remains dark enough to read.

- **Shell:** warm inset frame, fine ink lines, 12–16px outer padding. Cobalt drawing workspace occupies the largest area. A 72px header, 228px library/page sidebar, flexible stage, and 250px inspector provide stable drawing space. Side panels scroll independently. At narrow desktop widths reduce panel widths; below 1000px use a horizontally contained workspace rather than shrinking drawing controls to unreadability. Desktop app minimum 1100 × 720; mobile is outside scope.
- **Brand and headings:** tall narrow uppercase wordmark using locally available Impact/Arial Narrow fallback, approximately 28–34px, 2–3px tracking. Section headings 11px uppercase with 1.5px tracking; body/control text 12–14px system sans. The original fonts are unknown; substitutes are chosen for offline availability. Preserve contrast between display and utilitarian type.
- **Actions:** primary export is vermilion, straight-sided with a small radius and offset ink outline. Secondary actions use cream with thin ink borders. Selected tools use ink fill with cream foreground and a clear border. No pill-shaped default controls. Icon buttons have tooltips and accessible names.
- **Panels:** paper/cream surfaces, thin ink separators, restrained 5–10px corners. Avoid floating white cards, heavy shadows, gradients, and glossy effects. Use numbered section labels and generous margins around page/library groups.
- **Stage:** cobalt field with subtle dot grid; white page with fine outline and offset shadow. Page dimensions and zoom sit outside exported artwork. One small original line ornament may mark empty space. Avoid illustrative scenery behind editing handles.
- **UI library:** small visual previews of real editable components with labels, two columns. Buttons, inputs, checkbox, dropdown, cards, navbar, image placeholder, device frame. The preview outlines echo the ramen illustration's black line construction.
- **Inspector:** visible text labels, paired geometry fields, color swatches, outline-style chooser, layer/group/align actions. Selection and page states must be explicit.
- **Editor content:** clean and sketch outline styles per object, readable text, pen, arrows and annotations. Sketch style uses deterministic slight line deviations, not random jitter on every render. User colors and content govern artwork independently of shell styling.

## Interaction and access rules filling source gaps

Visible keyboard focus uses a 3px cobalt outline on light surfaces, cream on blue. Buttons have explicit disabled states. Undo/redo, delete, duplicate, grouping, select all, save/open and zoom have shortcuts; ordinary text fields retain native editing shortcuts. Tooltips identify shortcuts. Escape cancels drawing/selection. Pointer capture supports drags outside shape bounds. Pan with hand tool or Space-drag; zoom around cursor. Shift adds/removes selection; blank-space drag creates a marquee. Snap and guides can be toggled. Native labeled fields and dialog semantics are used for non-canvas controls. Canvas visual manipulation is accompanied by inspector numeric controls and a selectable layers list; full screen-reader drawing parity is not claimed.

Motion is not evidenced by either source. Adopt immediate state changes and no decorative animation; respect reduced-motion. Errors appear with clear recovery text. Unsaved state is visible, save/load works with downloadable project files, closing warns. No persistent autosave or cloud services. Export the current page at 1×/2× with annotations on/off; selection handles, stage, and guides never export.

## Accepted product scope

Offline Windows app using web technology, own window, desktop shortcut and installer. Named pages with phone/desktop/custom sizes. Editable grouped UI components, freehand, text, shapes, colors, notes and arrows; move/resize/duplicate/delete, undo/redo, multi-select, layering, group/ungroup, alignment guides, grid snapping, zoom/pan. Downloadable project file. PNG for later AI/UI-reference work. No AI API integration, accounts, cloud sync, or collaboration. Temporary crash recovery deferred.

## Verification record

Reference creation: both supplied images opened and inspected directly. No live source interactions or original fonts available. Implementation checks and screenshots will be recorded in `verification.md`; source observations above must not be confused with verified renderer behavior.

## Version 1.1 interaction decisions from user feedback

Drawing tools remain active until manually changed (V selects). With Select active, double-click shapes/text/notes to type on canvas. Ctrl+Enter or blur commits; Escape reverts the current text edit. SVG and PNG share word wrapping, alignment, padding and text color. Standalone text auto-grows downward by default; shapes remain fixed and clip excess text. Rectangles and ellipses support embedded labels, centered by default with 12px padding. Existing project fields remain valid without migration.

Shift-click and Ctrl/Command-click toggle multi-selection; selected objects drag together. Ctrl+C/Ctrl+V preserve editable object data and remap group IDs on paste, including across pages. Native text clipboard behavior stays intact while typing. Groups are convenience containers: direct double-click label editing, inspector component-text fields, individual part buttons, and Alt-click avoid mandatory ungrouping. These supersede the original requirement to ungroup library pieces for individual edits. The existing cream/red/cobalt visual authority remains unchanged.

## Version 1.2 — corrected Isekai authority

User clarification: the Isekai screenshot governs the color scheme, typography and aesthetic; ramen was supplied for layout. Adopt deep sky cobalt (#233e80), midnight blue (#192c58), cloud white (#f2f5f7), pale blue (#adc5e5), and muted cornflower (#7e9dd3). Values are chosen approximations of the screenshot, not source CSS samples. Remove vermilion/cream from the shell while keeping users' artwork colors intact. Panels use blue surfaces, thin pale imperfect outlines, and airy margins. The wordmark is tall, thin, widely tracked and outlined, rather than the old heavy Impact treatment. Original title font unknown: use local Segoe UI Light/Arial Narrow with an outline treatment. Section/display headings use local Segoe Print as a legible handwritten substitute; control labels/body remain Segoe UI for editing clarity. Do not imply these are the original source fonts.

Adapt the cloud/sky atmosphere with original lightweight vector cloud silhouettes at low opacity in the stage, leaving the canvas unobstructed. Use sketch-like control borders, pale blue primary actions, and explicit selected/focus states. Preserve the established useful header/sidebar/canvas/inspector arrangement, which is where the ramen reference still contributes. Page artwork stays neutral white. No character, skyline, title, or screenshot is pasted into the editor decoration.

Image objects can be pasted/imported, moved, resized, copied, cropped nondestructively and included in self-contained saved files and PNG exports. Crop editing shows the original image and a draggable selection, plus precise numeric bounds and reset. Background removal offers plain-background controls and automatic local subject extraction. All processing remains local; images are not uploaded. Changes participate in undo/redo. Restore original image is explicit and image operations do not overwrite source files.
