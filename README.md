# ClipSnap

**Never lose a screenshot to your clipboard again.**

Copy a screenshot, copy something else, and the first one is gone forever. ClipSnap sits quietly in the background, notices every new screenshot on your clipboard, and saves it to disk before you can overwrite it — then helps you file, annotate, and reuse it.

Built with Electron, HTML, CSS, and vanilla JavaScript. No frameworks.

---

## How it works

1. **Watches** — a timer checks the clipboard once every second for a new image.
2. **Saves** — anything new is written straight to your `Unsorted` folder as `snap_[timestamp].png`. An MD5 hash of the image data is compared against the last one, so the same screenshot is never saved twice.
3. **Asks** — a small floating card appears in the corner so you can rename the file or drop it into a category in one click.
4. **Organizes** — the dashboard lets you browse, search, annotate, and drag screenshots out into any other app.

---

## Features

### Capture
- Automatic clipboard watching — no hotkey to remember, no button to press
- Duplicate detection, so re-copying the same image doesn't clutter your folders
- Floating HUD notification with a live preview, a rename box, and quick-tag buttons
- Pin the HUD to stop it auto-hiding, or dismiss it instantly

### Organize
- Sidebar with **All Snaps**, **Unsorted**, and one entry per category
- Five folders exist from the start: `Unsorted`, `Study`, `Code`, `Bills`, `Personal`
- Create your own categories and pick an icon for each from a built-in icon set
- Live search by filename (`Ctrl` + `K` to jump straight to the search box)
- Sort by newest, oldest, or name
- Two ways to look at your library: a **Gallery** grid and a **Table** view
- Filter the sidebar itself when you have a lot of categories

### Select mode
Click **Select** in the toolbar to pick several screenshots at once, then:
- **Select All** / **Clear All** for everything currently on screen
- **Move to Category** in bulk
- **Copy** to the clipboard
- **Delete** in one go

Press `Escape` to leave Select mode.

### Annotate
A built-in markup editor with six tools:

| Tool | Use |
|---|---|
| Pen | Freehand drawing |
| Highlighter | Semi-transparent marker |
| Rectangle | Box something out |
| Arrow | Point at something |
| Blur | Cover up private details |
| Text | Type a note onto the image |

Plus a colour palette, adjustable stroke size, multi-step undo, and clear-all. Save over the original, save as a copy, or send the annotated version straight to your clipboard.

### Use anywhere
- **Drag out** any screenshot directly into Discord, Word, a browser, or any app that accepts files
- **Copy to clipboard** from the card, the right-click menu, or the editor
- **Show in folder** to open the file's location
- Right-click any screenshot for annotate / copy / reveal / delete

### Make it yours
- Dark and light themes
- Collapsible sidebar
- Frameless window with a custom titlebar and Windows 11 acrylic / macOS vibrancy blur
- Choose where screenshots are stored — pick any folder in Settings

---

## Getting started

You need [Node.js](https://nodejs.org) installed.

```bash
npm install
```

```bash
npm start
```

That's it. The window opens, the clipboard watcher starts, and your folders are created automatically on first run.

### Where your screenshots live

By default ClipSnap uses your Pictures folder:

```
~/Pictures/ClipSnap/
├── Unsorted/
├── Study/
├── Code/
├── Bills/
└── Personal/
```

If you use OneDrive, `~/OneDrive/Pictures/ClipSnap/` is used instead. You can change the location any time from **Settings → Change Folder** — ClipSnap remembers your choice.

Category folders are read from disk on every scan, so a folder you create in File Explorer shows up in the sidebar too.

---

## Project structure

| File | What's in it |
|---|---|
| `main.js` | Main process — window creation, clipboard watcher, all file operations, IPC handlers |
| `preload.js` | The safe bridge between the page and Node, via `contextBridge` |
| `index.html` | Dashboard layout |
| `renderer.js` | Dashboard logic — grid rendering, search, selection, annotation editor |
| `styles.css` | All styling, including both themes |
| `popup.html` / `popup.js` | The floating HUD notification |
| `generate-icon.js` | Helper script that builds the app icon |

The renderer never touches the filesystem directly. Every file operation goes through a named IPC channel (`move-file`, `delete-screenshot`, `save-annotated-image`, `start-drag`, and around twenty more), with `nodeIntegration` off and `contextIsolation` on.

---

## Built with

- [Electron](https://www.electronjs.org/) 43
- Plain HTML5, CSS (flexbox + grid, custom properties for theming), and vanilla JavaScript
- Node's `fs`, `path`, and `crypto` modules
- No UI frameworks, no build step, no bundler

---

## About

ClipSnap started as a third-year Software Engineering Web Programming lab project, which is why the code leans on straightforward, well-commented JavaScript — `getElementById`, `addEventListener`, `async`/`await`, and plain `try`/`catch` — rather than clever abstractions.

## License

MIT
