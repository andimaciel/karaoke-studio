import os
import json
import shutil
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
DATA_DIR = BASE_DIR / "data"
PROJECTS_DIR = DATA_DIR / "projects"
MODELS_DIR = DATA_DIR / "models"
TEMP_DIR = DATA_DIR / "temp"
SETTINGS_FILE = DATA_DIR / "settings.json"

for d in [DATA_DIR, PROJECTS_DIR, MODELS_DIR, TEMP_DIR]:
    d.mkdir(parents=True, exist_ok=True)

# Ensure FFmpeg is accessible
def ensure_ffmpeg_path():
    # 1. Quick check PATH
    found = shutil.which("ffmpeg")
    if found:
        return found

    # 2. Direct check known winget path on Windows
    local_app_data = os.environ.get("LOCALAPPDATA", "")
    known_path = Path(local_app_data) / "Microsoft" / "WinGet" / "Packages" / "Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe" / "ffmpeg-9.0.2-full_build" / "bin" / "ffmpeg.exe"
    if known_path.exists():
        bin_dir = str(known_path.parent)
        os.environ["PATH"] = bin_dir + os.pathsep + os.environ.get("PATH", "")
        return str(known_path)

    return "ffmpeg"

FFMPEG_BIN = ensure_ffmpeg_path()
FFPROBE_BIN = shutil.which("ffprobe") or str(Path(FFMPEG_BIN).parent / "ffprobe.exe") if Path(FFMPEG_BIN).is_absolute() else "ffprobe"


DEFAULT_SETTINGS = {
    "default_separation_model": "UVR-MDX-NET-Inst_HQ_3.onnx",
    "default_karaoke_model": "UVR_MDXNET_KARA_2.onnx",
    "whisper_model_size": "base",
    "audioshake_api_key": "",
    "export_resolution": "1920x1080",
    "export_fps": 30,
}

def get_settings():
    if SETTINGS_FILE.exists():
        try:
            with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                saved = json.load(f)
                res = {**DEFAULT_SETTINGS, **saved}
                return res
        except Exception:
            pass
    return DEFAULT_SETTINGS.copy()

def update_settings(new_settings: dict):
    current = get_settings()
    current.update(new_settings)
    with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
        json.dump(current, f, indent=2, ensure_ascii=False)
    return current
