# README comparison

Clean copy: [README.md](../README.md). Removed lines are struck out; additions are bold. Compared with the README saved immediately before release preparation.

\# SketchUI



\!\[SketchUI logo\](src/assets/icon.svg)



An offline Windows app for sketching interfaces and exporting them as visual references for AI-assisted development.



\#\# Purpose:



The best way to help AI design what you have in mind is to lay it out. SketchUI gives you a place to draw shapes, add text and images, and arrange interface elements before asking AI to build them.



Share the exported sketch with a few references and notes about how it should work. That gives your AI something concrete to follow. For now, the app helps you get the idea onto the page; it does not generate HTML or CSS.



\#\# How to Install:



**If you have a packaged Windows build, run \`SketchUI-Setup-1.3.1-x64.exe\` and follow the installer. You can then open SketchUI from its desktop shortcut.**

~~If you have a packaged Windows build, run \`SketchUI-Setup-1.3.0-x64.exe\` and follow the installer. You can then open SketchUI from its desktop shortcut.~~



You can also run \`win-unpacked/SketchUI.exe\` from an unpacked build. Keep the whole \`win-unpacked\` folder together.



Release downloads: \[GitHub Releases\](https://github.com/jeevanjohnson/Sketch-UI/releases). To build the app yourself, follow the developer instructions below. Once installed, the app works offline, including image background removal.



\#\# Usecases:



- Sketch a page or app screen before asking AI to build it.

- Combine text, shapes, images and editable UI components into a layout.

- Add notes and arrows to explain how an interface should work.

- Export a PNG to share in a design conversation.

- Save an editable \`.sketchui\` project and return to it later.



Save (\`Ctrl+S\`) updates the current project file. Save As (\`Ctrl+Shift+S\`) creates a separate copy. New saves default to an automatically created \`Documents/SketchUI/\<project name\>/\` folder. Existing \`.sketchroom\` files still open. There is no autosave.



\#\# How to install (for devs):



\#\#\# Let your agent handle setup



If you want your agent to install it for you, give it this repository link or the downloaded folder, then copy and paste this prompt:



\`\`\`text

Help me install and run SketchUI locally on Windows from https://github.com/jeevanjohnson/Sketch-UI or the project folder I provide.



Read README.md, AGENTS.md and package.json first. Check that Node.js 22.12 or newer and npm are available. From the repository root, run npm ci, npx install-electron --no, and npm start.



**If setup fails, diagnose the error without changing app features or overwriting my projects. Once the app runs, build the Windows installer with npm run dist. Tell me where releases/SketchUI-Setup-1.3.1-x64.exe and releases/win-unpacked/SketchUI.exe were created and how to open the app. Do not commit, push or publish anything.**

~~If setup fails, diagnose the error without changing app features or overwriting my projects. Once the app runs, build the Windows installer with npm run dist. Tell me where releases/SketchUI-Setup-1.3.0-x64.exe and releases/win-unpacked/SketchUI.exe were created and how to open the app. Do not commit, push or publish anything.~~

\`\`\`



\#\#\# Install manually



If you prefer to do it manually, install Node.js 22.12 or newer on Windows, then clone or download this repository. Open a terminal in the repository root and run:



\`\`\`powershell

npm ci

npx install-electron --no

npm start

\`\`\`



The initial setup needs an internet connection to download dependencies and local model files.



To check the source and run the unit tests:



\`\`\`powershell

npm run check

npm test

\`\`\`



To build the Windows installer:



\`\`\`powershell

npm run dist

\`\`\`



Build output goes into \`releases/\`. \`npm run preview\` serves a local browser preview at \`http://127.0.0.1:5173\`; automatic image cutouts and native file saving require the desktop app.



The repository uses \`src/\` for code, \`agent-references/\` for project guidance, \`architecture/\` for the offline architecture explorer, and \`releases/\` for local builds. See the \[user guide\](agent-references/GUIDE.md), \[repository conventions\](agent-references/repository-conventions.md), and \[verification record\](agent-references/verification.md) for details. SketchUI is licensed under \[AGPL-3.0\](LICENSE): you may use, modify and redistribute it, including commercially, subject to its source-sharing requirements.
