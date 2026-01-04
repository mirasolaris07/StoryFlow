<div align="center">
<!-- <img width="800" alt="AdventureForge Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" /> -->
[![☕ Buy me a coffee](https://img.shields.io/badge/☕-Buy%20me%20a%20coffee-orange.svg?style=for-the-badge&logo=buy-me-a-coffee)](https://buymeacoffee.com/yuchenghuang)

<h1>AdventureForge: Visual Story Editor</h1>
</div>

**AdventureForge** is a modern, web-based visual novel engine designed to bridge the gap between simple visual editors (TyranoBuilder) and complex node-based systems (ComfyUI). It enables creators to build interactive stories with a powerful node graph, drag-and-drop scene editing, and a rich dialogue system, then export them as standalone applications.

---

## ✨ Key Features

### 🛠 Visual Graph Editor
- **Node-Based Flow**: Organize your story logic with Start, Scene, Logic, and End nodes.
- **[PLANNED] Super Node**: Group entire Story Branches (e.g., "Route A", "Bad Ending") into a single, namable container to keep your workspace clean.

### 🎨 Visual Scene Editor
- **Drag & Drop Staging**: Place characters directly onto the scene canvas.
- **Real-Time Preview**: See exactly how your scene looks with the dialogue box overlay.
- **Scale & Flip**: Visual controls to adjust character size and facing.

### 🎭 Advanced Dialogue System
- **Typewriter Effect**: Text appears character-by-character with natural pauses.
- **Character Themes**: Different speakers (Narrator, Hero, Villain) have unique text box styles.
- **Visual Styling**: Customize colors, opacity, fonts, and window dimensions (Width/Height/Position).
- **Auto-Resizing Text**: The input box grows as you write.

### 🚀 Export & Deployment
- **JSON Project Record**: Save and load your work-in-progress.
- **Standalone App (.exe)**: Export your finished visual novel as a Windows application.

---

## 💻 Execution & Build

### Prerequisites
- Node.js (v18+)
- Python 3.10+ (for backend server)

### 1. Development Mode
To run the editor locally:

```bash
# Install dependencies
npm install

# Start the Editor and Backend (Concurrent)
npm run dev:stack
# OR run them separately:
# Terminal 1: python server.py
# Terminal 2: npm run dev
```

### 2. Exporting Your Game

#### A. Export Data (Backup)
Use the **Export Data** section in the sidebar:
- **JSON**: Standard project record.
- **YAML**: Human-readable format.
- **Script (Ren'Py)**: Linear story script (YAML) for writers.

#### B. Build Standalone Story Player (.exe)
To export *just the story* for players:
1.  Click **"Export Story (.exe)"** in the sidebar.
2.  **Check your Taskbar**: A folder selection window will open.
3.  Select the destination folder.
4.  The app will build and save to `[Selected Folder]/AdventureStory_Standalone`.

*Note: The build process automatically cleans the cache to prevent errors.*

#### C. Build Editor App (.exe)
To build the full editor for yourself:
```bash
npm run electron:build
```
**Editor App Location:** `release/win-unpacked/AdventureForge.exe`.

#### Build Mobile Apps (Android/iOS)
```bash
# Sync web code to native projects
npm run cap:sync

# Open Android Studio to build APK
npm run cap:android

# Open Xcode to build iOS App
npm run cap:ios
```
**Mobile Project Locations:** `android/` and `ios/` folders.

---

## 🗺 Roadmap
See [PROJECT.md](PROJECT.md) for the detailed development roadmap.
