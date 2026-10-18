import json
import uuid
import shutil
import threading
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional, List
import requests

from backend.config import PROJECTS_DIR
from backend.services.supabase_service import SupabaseService

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

        # Sincroniza criação do projeto no Supabase
        SupabaseService.upsert_project(initial_data, async_mode=True)
            
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

        # Se não encontrado localmente, busca no Supabase
        remote_data = SupabaseService.get_project(project_id)
        if remote_data:
            try:
                pdir = PROJECTS_DIR / project_id
                pdir.mkdir(parents=True, exist_ok=True)
                with open(pdir / "project.json", "w", encoding="utf-8") as f:
                    json.dump(remote_data, f, indent=2, ensure_ascii=False)
                with _LOCK:
                    _JOBS[project_id] = remote_data
                return remote_data
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

            # Sincroniza atualizações com o Supabase em background
            SupabaseService.upsert_project(proj, async_mode=True)

            return proj

    @staticmethod
    def list_projects() -> List[Dict[str, Any]]:
        local_projects_map: Dict[str, Dict[str, Any]] = {}
        if PROJECTS_DIR.exists():
            for pdir in PROJECTS_DIR.iterdir():
                if pdir.is_dir() and (pdir / "project.json").exists():
                    proj = JobManager.get_project(pdir.name)
                    if proj:
                        local_projects_map[proj["id"]] = {
                            "id": proj["id"],
                            "created_at": proj.get("created_at"),
                            "title": proj.get("song_info", {}).get("title") or "Sem título",
                            "artist": proj.get("song_info", {}).get("artist") or "Desconhecido",
                            "status": proj.get("status", "unknown"),
                            "has_video": bool(proj.get("render", {}).get("video_url")),
                            "synced": SupabaseService.is_configured()
                        }

        # Busca projetos no Supabase para mesclar projetos salvos na nuvem
        try:
            remote_list = SupabaseService.list_projects()
            for r in remote_list:
                rid = r["id"]
                if rid not in local_projects_map:
                    local_projects_map[rid] = {
                        "id": rid,
                        "created_at": r.get("created_at"),
                        "title": r.get("title") or "Sem título",
                        "artist": r.get("artist") or "Desconhecido",
                        "status": r.get("status", "unknown"),
                        "has_video": False,
                        "synced": True,
                        "cloud_only": True
                    }
                else:
                    local_projects_map[rid]["synced"] = True
        except Exception:
            pass

        projects = list(local_projects_map.values())
        projects.sort(key=lambda x: str(x.get("created_at", "")), reverse=True)
        return projects

    @staticmethod
    def delete_project(project_id: str) -> bool:
        with _LOCK:
            _JOBS.pop(project_id, None)
        pdir = PROJECTS_DIR / project_id
        if pdir.exists():
            shutil.rmtree(pdir, ignore_errors=True)
        # Exclui do Supabase se configurado
        url, key, _ = SupabaseService._get_credentials()
        if url and key:
            try:
                requests.delete(f"{url}/rest/v1/projects?id=eq.{project_id}", headers={
                    "apikey": key,
                    "Authorization": f"Bearer {key}"
                }, timeout=5)
            except Exception:
                pass
        return True
