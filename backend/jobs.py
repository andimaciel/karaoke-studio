import json
import uuid
import threading
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional
from backend.config import PROJECTS_DIR

_JOBS: Dict[str, Dict[str, Any]] = {}
_LOCK = threading.RLock()

class JobManager:
    @staticmethod
    def create_project(project_id: Optional[str] = None) -> str:
        pid = project_id or str(uuid.uuid4())[:8]
        pdir = PROJECTS_DIR / pid
        pdir.mkdir(parents=True, exist_ok=True)
        
        initial_data = {
            "id": pid,
            "created_at": datetime.now().isoformat(),
            "status": "created",
            "progress": 0,
            "message": "Projeto inicializado",
            "song_info": {
                "title": "",
                "artist": "",
                "language": "auto",
                "show_intro": True
            },
            "media": {},
            "separation": {},
            "lyrics": {
                "detected_language": "",
                "lines": [],
                "full_text": ""
            },
            "render": {
                "status": "idle",
                "progress": 0,
                "video_url": None,
                "ass_url": None,
                "instrumental_url": None
            }
        }
        
        with open(pdir / "project.json", "w", encoding="utf-8") as f:
            json.dump(initial_data, f, indent=2, ensure_ascii=False)
            
        with _LOCK:
            _JOBS[pid] = initial_data
            
        return pid

    @staticmethod
    def get_project(project_id: str) -> Optional[Dict[str, Any]]:
        with _LOCK:
            if project_id in _JOBS:
                return _JOBS[project_id]
                
        pfile = PROJECTS_DIR / project_id / "project.json"
        if pfile.exists():
            try:
                with open(pfile, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    with _LOCK:
                        _JOBS[project_id] = data
                    return data
            except Exception:
                pass
        return None

    @staticmethod
    def update_project(project_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        with _LOCK:
            proj = JobManager.get_project(project_id)
            if not proj:
                raise ValueError(f"Projeto {project_id} não encontrado.")
                
            for k, v in updates.items():
                if isinstance(v, dict) and isinstance(proj.get(k), dict):
                    proj[k].update(v)
                else:
                    proj[k] = v
                    
            pdir = PROJECTS_DIR / project_id
            pdir.mkdir(parents=True, exist_ok=True)
            with open(pdir / "project.json", "w", encoding="utf-8") as f:
                json.dump(proj, f, indent=2, ensure_ascii=False)
                
            _JOBS[project_id] = proj
            return proj

    @staticmethod
    def list_projects() -> list:
        projects = []
        for pdir in PROJECTS_DIR.iterdir():
            if pdir.is_dir() and (pdir / "project.json").exists():
                proj = JobManager.get_project(pdir.name)
                if proj:
                    projects.append({
                        "id": proj["id"],
                        "created_at": proj.get("created_at"),
                        "title": proj.get("song_info", {}).get("title") or "Sem título",
                        "artist": proj.get("song_info", {}).get("artist") or "Desconhecido",
                        "status": proj.get("status", "unknown"),
                        "has_video": bool(proj.get("render", {}).get("video_url"))
                    })
        projects.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        return projects
