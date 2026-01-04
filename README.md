[![☕ Buy me a coffee](https://img.shields.io/badge/☕-Buy%20me%20a%20coffee-orange.svg?style=for-the-badge&logo=buy-me-a-coffee)](https://buymeacoffee.com/yuchenghuang)

<div align="center">
<img width="800" alt="StoryFlow Interface" src="project_images/main_interface.png" />



<h1>StoryFlow: AI-Powered Visual Novel Editor</h1>

**Flow-based Visual Novel Editor with AI-powered voice over, node-based logic, and advanced story development staging.**

</div>

---

## 🎥 Visual Demo
<div align="center">
  <video src="project_videos/demo_video.mp4" width="100%" controls autoplay muted loop></video>
</div>

---

## 🤖 AI-Powered Functions
StoryFlow integrates modern AI to streamline the creation process:
- **AI Voice Over (TTS)**: Automatically generate high-quality character voices using the Google TTS / Gemini API integration.
- **LLM-Driven Branching**: (In Progress) Use LLMs to determine story flow based on user input, creating dynamic experiences.
- **Smart Staging**: Automated health checks that identify missing assets or broken paths instantly.

---

## ✨ Key Features

### 🛠 Node-Based Flow (The "ComfyUI" Feel)
- **Logic Nodes**: Expression-based conditions (`gold > 10`) and variable setters.
- **Visual Connectivity**: Organize your story with Start, Scene, Logic, and End nodes.
- **[NEW] Video Nodes**: Dedicated nodes for full-screen cinematic cutscenes.

### 🎨 Visual Scene Editor (The "TyranoBuilder" Feel)
- **WYSIWYG Staging**: Drag and drop characters directly onto the scene canvas.
- **Real-Time Preview**: Instant feedback on text box styling and character placement.
- **Scale & Flip**: Visual controls to adjust character size and facing.

<div align="center">
<img width="45%" alt="Scene Editor" src="project_images/scene_editor.png" />
<img width="45%" alt="Voice Manager" src="project_images/voice_manager_with_tts.png" />
</div>

---

## 📝 TODO Features (Phase 3 & 4)
- [ ] **Animation System**: Support for `fade`, `slide`, `shake`, and `dissolve` transitions.
- [ ] **Super Node**: Collapsible nodes to contain entire story branches.
- [ ] **Asset Library**: Integrated file browser for easier asset management.
- [ ] **Dice Roll System**: RPG-style mechanics with visual dice overlays.

---

## 💻 Execution & Build

### Prerequisites
- Node.js (v18+)
- Python 3.10+ (for backend server)

### 1. Development Mode
```bash
# Install dependencies
npm install

# Start the Editor and Backend (Concurrent)
npm run dev:stack
```

### 2. Exporting Your Game
- **Export Story (.exe)**: Build a standalone player for your readers.
- **Mobile Support**: Export to **Android** and **iOS** via Capacitor.
- **Developer Mode Check**: Automated pre-build validation for Windows users.

---

## 🗺 Roadmap
See [PROJECT.md](PROJECT.md) for the detailed development roadmap.
