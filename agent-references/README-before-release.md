# Sketch UI

![Sketch UI logo](src/assets/icon.svg)

An offline Windows app for sketching interfaces and exporting them as visual references for AI-assisted development.

## Purpose:

The best way to help AI design what you have in mind is to lay it out. Sketch UI gives you a place to draw shapes, add text and images, and arrange interface elements before asking AI to build them.

Share the exported sketch with a few references and notes about how it should work. That gives your AI something concrete to follow. For now, the app helps you get the idea onto the page; it does not generate HTML or CSS.

## How to Install:

If you have a packaged Windows build, run `Sketchroom Setup <version>.exe` and follow the installer. You can then open Sketchroom from its desktop shortcut. The installed app currently uses the name **Sketchroom**.

You can also run `win-unpacked/Sketchroom.exe` from an unpacked build. Keep the whole `win-unpacked` folder together.

No public download is configured yet. To build the app yourself, follow the developer instructions below. Once installed, the app works offline, including image background removal.

## Usecases:

- Sketch a page or app screen before asking AI to build it.
- Combine text, shapes, images and editable UI components into a layout.
- Add notes and arrows to explain how an interface should work.
- Export a PNG to share in a design conversation.
- Save an editable `.sketchroom` project and return to it later.

Save (`Ctrl+S`) updates the current project file. Save As (`Ctrl+Shift+S`) creates a separate copy. New saves default to an automatically created `Documents/Sketchroom/<project name>/` folder. There is no autosave.

## How to install (for devs):

Install Node.js 22.12 or newer on Windows, then clone or download this repository. Open a terminal in the repository root and run:

```powershell
npm ci
npx install-electron --no
npm start
```

The initial setup needs an internet connection to download dependencies and local model files.

To check the source and run the unit tests:

```powershell
npm run check
npm test
```

To build the Windows installer:

```powershell
npm run dist
```

Build output goes into `releases/`. `npm run preview` serves a local browser preview at `http://127.0.0.1:5173`; automatic image cutouts and native file saving require the desktop app.

The repository uses `src/` for code, `agent-references/` for project guidance, `architecture/` for the offline architecture explorer, and `releases/` for local builds. See the [user guide](agent-references/GUIDE.md), [repository conventions](agent-references/repository-conventions.md), and [verification record](agent-references/verification.md) for details. A project license has not been selected yet.
