# Sketchroom

## Purpose

The best way to help AI design what you have in mind is to lay it out. Sketchroom gives you quick tools to sketch a UI during your session: draw shapes, add text and images, move things around, and export the result.

Give your AI the sketch, a couple of references, and some notes about how it should work. That gives it something concrete to build from and helps you get closer to the design you actually want.

Ideally, this would generate the HTML and CSS too. For now, it's a quick way to get the idea out of your head and into the conversation.

## How to install

Sketchroom runs locally on Windows. You'll need an internet connection for the initial setup; after that, the app works offline, including image background removal.

### Give your LLM this prompt

Provide the repository link or the downloaded project folder, then paste:

```text
Help me install and run Sketchroom locally on Windows using the repository link or project folder I've provided.

Read the project's setup instructions and package.json first. Check that Node.js 22.12 or newer and npm are installed, then open a terminal in the project folder and run:

npm ci
npx install-electron --no
npm start

If a command fails, diagnose and fix the setup problem without changing the app's features or overwriting my project files.

Once it runs, build the Windows installer with npm run dist. Tell me where the installer and standalone executable were created so I can open the app without a terminal next time.
```

### Or install it manually

If you already have the packaged app, run `Sketchroom Setup 1.2.0.exe` to install it, or open `win-unpacked/Sketchroom.exe` directly from the release folder.

To build it yourself:

1. Install Node.js 22.12 or newer, which includes npm.
2. Download or clone this repository and open a terminal in its folder.
3. Run:

   ```powershell
   npm ci
   npx install-electron --no
   npm start
   ```

To create an installer, run:

```powershell
npm run dist
```

You'll find the installer and `win-unpacked/Sketchroom.exe` in `dist/`.

Save your work as a `.sketchroom` project file before closing or switching versions. See [the guide](GUIDE.md) for editing controls, image tools, and development details.

Desktop Save updates the current file. Save As creates a separate copy. New saves default to an automatically created `Documents/Sketchroom/<project name>/` folder.

See [repository conventions](docs/repository-conventions.md) for source layout and public release prerequisites, including the pending license choice.
