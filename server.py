
import os
import shutil
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from pathlib import Path

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Directories to serve
BASE_DIR = Path(__file__).resolve().parent
DIST_DIR = BASE_DIR / "dist"
CHAR_DIR = BASE_DIR / "Character"
SCENE_DIR = BASE_DIR / "Scene"
AUDIO_DIR = BASE_DIR / "audio"
GAME_BUILD_DIR = BASE_DIR / "game" / "build"

# Ensure directories exist
CHAR_DIR.mkdir(exist_ok=True)
SCENE_DIR.mkdir(exist_ok=True)
AUDIO_DIR.mkdir(exist_ok=True)
GAME_BUILD_DIR.mkdir(parents=True, exist_ok=True)

# Mount static directories
app.mount("/Character", StaticFiles(directory=str(CHAR_DIR)), name="Character")
app.mount("/Scene", StaticFiles(directory=str(SCENE_DIR)), name="Scene")
app.mount("/audio", StaticFiles(directory=str(AUDIO_DIR)), name="audio")
app.mount("/game/build", StaticFiles(directory=str(GAME_BUILD_DIR)), name="game_build")
# Mount assets from dist if they exist (for production/standalone run)
if (DIST_DIR / "assets").exists():
    app.mount("/assets", StaticFiles(directory=str(DIST_DIR / "assets")), name="assets")

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...), path: str = None):
    """
    Uploads a file to a specific subdirectory.
    path: e.g. "Character/Aerin" or "Scene"
    """
    if not path:
        raise HTTPException(status_code=400, detail="Path parameter is required")

    # Sanitize path to prevent directory traversal
    safe_path = Path(path).resolve()
    if not str(safe_path).startswith(str(BASE_DIR)):
         raise HTTPException(status_code=403, detail="Invalid path")
    
    # Ensure target directory exists
    target_dir = BASE_DIR / path
    target_dir.mkdir(parents=True, exist_ok=True)

    file_path = target_dir / file.filename
    
    try:
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save file: {e}")

    import time
    timestamp = int(time.time())
    relative_url = f"/{path}/{file.filename}?t={timestamp}".replace("\\", "/")
    
    return {"url": relative_url}

from fastapi.responses import StreamingResponse
import asyncio

async def run_command_stream(cmd, cwd, env=None):
    """Runs a command and yields stdout/stderr lines."""
    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        cwd=str(cwd),
        env=env
    )

    async def stream_output(stream, prefix=""):
        while True:
            line = await stream.readline()
            if not line:
                break
            yield f"{prefix}{line.decode(errors='replace').strip()}\n"

    # Combine stdout and stderr
    async for line in stream_output(process.stdout, "LOG: "):
        yield line
    async for line in stream_output(process.stderr, "ERR: "):
        yield line

    await process.wait()
    if process.returncode != 0:
        yield f"STATUS: FAILED (Exit Code {process.returncode})\n"
    else:
        yield "STATUS: SUCCESS\n"

@app.post("/api/build")
async def build_app(request_data: dict = None):
    # Unpack data
    record = request_data.get("record") if request_data else None
    project_slug = request_data.get("projectName", "AdventureStory") if request_data else "AdventureStory"
    
    # Clean up project slug for filename usage
    project_slug = "".join(c for c in project_slug if c.isalnum() or c in (' ', '_', '-')).strip().replace(' ', '_')

    import tkinter as tk
    from tkinter import filedialog
    
    # Initialize Tkinter (hidden root)
    root = tk.Tk()
    root.withdraw()
    root.attributes('-topmost', True) # Bring to front

    print(f"Requesting Export Path for '{project_slug}'...")
    
    # 1. Ask User for Save Location
    target_path_str = filedialog.asksaveasfilename(
        title="Choose Save Location for Standalone Game",
        initialfile=project_slug,
        defaultextension=""
    )
    root.destroy()
    
    if not target_path_str:
        return JSONResponse(content={"status": "cancelled", "message": "Export cancelled by user."})

    target_dir = Path(target_path_str).resolve()
    base_target = target_dir.parent
    
    if target_dir.suffix:
        target_dir = target_dir.parent / target_dir.stem / "AdventureStory_Standalone"
    else:
        target_dir = target_dir / "AdventureStory_Standalone"

    async def build_generator():
        yield f"STATUS: STARTING\n"
        yield f"LOG: Project: {project_slug}\n"
        yield f"LOG: Target: {target_dir}\n"

        try:
            # 0. Save Project Data
            if record:
                yield "LOG: Saving project data...\n"
                data_file = BASE_DIR / "public" / "data.json"
                (BASE_DIR / "public").mkdir(exist_ok=True)
                with data_file.open("w", encoding="utf-8") as f:
                    import json
                    json.dump(record, f, indent=2)

            # 1. Clean Cache & Folders
            yield "LOG: Cleaning build folders & cache...\n"
            # Clean local build folders
            for folder in ["dist", "release-player"]:
                f_path = BASE_DIR / folder
                if f_path.exists():
                    try:
                        shutil.rmtree(f_path)
                    except Exception as e:
                        yield f"LOG: Warning: Could not clean {folder}: {e}\n"

            user_home = Path(os.path.expanduser("~"))
            cache_dir = user_home / "AppData" / "Local" / "electron-builder" / "Cache"
            if cache_dir.exists():
                win_sign = cache_dir / "winCodeSign"
                if win_sign.exists(): shutil.rmtree(win_sign)
                nsis = cache_dir / "nsis"
                if nsis.exists(): shutil.rmtree(nsis)

            # 2. Build
            env = os.environ.copy()
            env["VITE_APP_MODE"] = "player"
            
            yield "STATUS: BUILDING_VITE\n"
            async for line in run_command_stream(["cmd", "/c", "npm run build"], BASE_DIR, env):
                yield line
                if "FAILED" in line: return

            # 4. Copy Assets
            yield "LOG: Bundling assets...\n"
            for folder in ["audio", "Character", "Scene"]:
                src = BASE_DIR / folder
                dst = BASE_DIR / "dist" / folder
                if src.exists():
                    if dst.exists(): shutil.rmtree(dst)
                    shutil.copytree(src, dst)

            yield "STATUS: COMPILING_ELECTRON\n"
            async for line in run_command_stream(["cmd", "/c", "npm run electron:compile"], BASE_DIR):
                yield line
                if "FAILED" in line: return

            yield "STATUS: PACKAGING\n"
            async for line in run_command_stream(["cmd", "/c", "npx electron-builder --config electron-builder.player.json"], BASE_DIR, env):
                yield line
                if "FAILED" in line: return

            # 6. Copy Result
            yield "LOG: Exporting to final location...\n"
            source_dir = BASE_DIR / "release-player" / "win-unpacked"
            if source_dir.exists():
                if target_dir.exists(): shutil.rmtree(target_dir)
                shutil.copytree(source_dir, target_dir)
                yield f"STATUS: COMPLETE|{str(target_dir / 'AdventureForge.exe')}\n"
            else:
                yield "ERR: Build finished but release folder missing.\n"
                yield "STATUS: FAILED\n"

        except Exception as e:
            yield f"ERR: {str(e)}\n"
            yield "STATUS: FAILED\n"

    return StreamingResponse(build_generator(), media_type="text/event-stream")



@app.get("/")
async def serve_index():
    if (DIST_DIR / "index.html").exists():
        return FileResponse(DIST_DIR / "index.html")
    return {"message": "App not built. Run 'npm run build' first."}

@app.get("/{catchall:path}")
async def serve_files(catchall: str):
    # Fallback for SPA routing - serve index.html if file not found
    file_path = DIST_DIR / catchall
    if file_path.exists() and file_path.is_file():
        return FileResponse(file_path)
    if (DIST_DIR / "index.html").exists():
        return FileResponse(DIST_DIR / "index.html")
    return {"error": "File not found"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
