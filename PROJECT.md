# AdventureForge: Project Description & Roadmap

## Vision
To build a **next-generation Visual Novel Engine** that combines the ease of visual scene editing (like **TyranoBuilder**) and the power of scripting (like **Ren'Py**) with a modern, node-based flow architecture (like **n8n** or **ComfyUI**).

## Core Philosophy
1.  **Flow-First**: The story logic is a graph. Branches, loops, and logic are visible connections.
2.  **Visual Staging**: Scenes are edited visually. Drag characters, resize backgrounds, style text boxes instantly.
3.  **Hybrid Workflow**:
    - **Designers** use the Visual Editor (Web).
    - **Writers** use the YAML format (`game/story/main.yaml`).
    - **Developers** extend the engine with React & Python.

## TODO List

### 🛠 Editor Interface (The "ComfyUI" Feel)
- [ ] **Enhanced Graph UI**: Darker, sleeker nodes. Clearer input/output sockets.
- [ ] **Minimap & Controls**: easier navigation for large stories.

### 🎨 Visual Scene Editor (The "TyranoBuilder" Feel)
- [x] **Stage Preview**: Interactive stage preview in the Inspector.
- [x] **Scene Editor Modal**: Full-screen modal for precise character staging.
- [x] **Character Dragging**: Drag & drop characters to set their `x/y` coordinates.
- [x] **Resize/Scale**: Visual controls for scaling and flipping sprites.
- [x] **Real-time Preview**: See exactly how the text box looks on top of the scene.

### 🎭 Visual Novel Features (The "Ren'Py" Power)
- [ ] **Animation System**: Support for `fade`, `slide`, `shake`, `dissolve` transitions.
- [x] **Dialogue Box Editor**:
    - [x] Custom Theme Editor (Colors, Opacity, Fonts).
    - [x] Adjustable vertical positioning and height.
    - [x] Adjustable width and horizontal positioning.
    - [x] Live preview in editor.
    - [ ] **Advanced Visuals (Section 4)**: 9-slice `border-image` for retro frames & `backdrop-filter` for glassmorphism.
    - [ ] **Auto-Pagination (Section 5)**: Algorithmic splitting of long text to fit container.
    - [x] **Adjustable Sizing**: Height, Width, X/Y Positioning sliders.
- [ ] **Story Flow (Advanced)**:
    - [ ] **Super Node (Route Container)**: A collapsible node that contains an entire branch (e.g., "Route A"). Can be expanded/extracted to organize large graphs.
- [ ] **Asset Library**: clearer "File Browser" for accumulated assets.
- [ ] **Variable System**:
    - [x] **Setter Node**: Atomic state updates.
    - [x] **Logic Node**: Expression-based conditions (`gold > 10`).
    - [x] **Debug Overlay**: Real-time attribute monitoring.

### 🎮 Game Systems Core (Phase 3)
- [ ] **Main Menu System**:
    - Screen State Machine (Menu/Game/Settings).
    - UI: Start, Load, Settings, Gallery.
- [ ] **Save/Load Functionality**:
    - Persistence Layer (localStorage/File).
    - Slot Management (Thumbnails, Time).
- [ ] **Global Settings**:
    - Volume Mixer (BGM, SFX, Voice).
    - Text Speed / Auto-Forward Speed.
- [ ] **Voice Acting**:
    - Voice Asset Management in Inspector.
    - `AudioManager` integration with Text Sync.
    - **Feature**: Text plays faster than voice (configurable).
- [ ] **Jump Node**:
    - no scene, scene forwarding
    - takes in the node name
    - directly switch to the node
- [ ] **LLM Switching Base Node**:
    - Input box on the scene for user to talk to the LLM
    - LLM roll settings
    - branches connect to the nodes for LLM to decide which node to go to
    - Based on the conversation, LLM decides which node to go to


### 🎲 Advanced Mechanics (Phase 4)
- [ ] **Dice Roll System**:
    - Usage of Character Stats (Strength, Luck).
    - Visual Dice Overlay (D20, D6).
- [ ] **AI Enhancement**:
    - **LLM-to-Flow**: Convert script text directly into node blocks.
    - **Auto-Voiceover**: Generate voice lines using TTS/AI, gemini api.
    
- [ ] **LLM Switching Agentic Node**:
    - Input box on the scene for user to talk to the LLM
    - LLM roll settings
    - branches connect to the nodes for LLM to decide which node to go to
    - Based on the conversation, LLM decides which node to go to
    - LLM has tools to use, for example dice roll, weapons, card playing, drawing, etc.

### ⏩ Player Comfort (Phase 5)
- [ ] **Playback Controls**:
    - Skip Mode (Fast forward).
    - Auto-Advance (Wait for Voice).
- [ ] **History System**: Returns to previous dialogue visible in a log.

### 💾 Data & I/O
- [x] **YAML Sync**: Visual changes (dragging) sync primarily to `story.json` currently.
- [ ] **Save/Load**: Robust system for save slots and autosaves.
- [x] **Advanced Exports**:
    - [x] **Data**: JSON and YAML project records.
    - [x] **Script**: Ren'Py-style YAML export for writers.
- [x] **Electron Export**: 
    - [x] **Editor**: Full creation tool.
    - [x] **Player**: Standalone story runner with file picker.

### 🚀 Architecture
- [x] **Python/FastAPI**: Serves the build and assets.
- [x] **React/Vite**: Main editor interface.
- [x] **Electron**: Wrapper for desktop deployment.
