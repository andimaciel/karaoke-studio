import os
import json
import logging
import threading
from datetime import datetime
from typing import Dict, Any, List, Optional
import requests

from backend.config import get_settings, PROJECTS_DIR

logger = logging.getLogger("supabase_service")

class SupabaseService:
    @staticmethod
    def _get_credentials():
        settings = get_settings()
        url = os.environ.get("SUPABASE_URL") or settings.get("supabase_url", "")
        key = os.environ.get("SUPABASE_KEY") or settings.get("supabase_key", "")
        enabled = settings.get("supabase_sync_enabled", True)
        return url.strip().rstrip("/"), key.strip(), enabled

    @classmethod
    def is_configured(cls) -> bool:
        url, key, _ = cls._get_credentials()
        return bool(url and key)

    @classmethod
    def test_connection(cls) -> Dict[str, Any]:
        url, key, _ = cls._get_credentials()
        if not url or not key:
            return {"connected": False, "message": "Supabase URL ou Chave de API não configuradas."}
        try:
            headers = {
                "apikey": key,
                "Authorization": f"Bearer {key}",
            }
            resp = requests.get(f"{url}/rest/v1/projects?limit=1", headers=headers, timeout=5)
            if resp.status_code in [200, 206]:
                return {"connected": True, "message": "Conectado ao Supabase com sucesso!"}
            return {"connected": False, "message": f"Erro de conexão ({resp.status_code}): {resp.text}"}
        except Exception as e:
            return {"connected": False, "message": f"Falha ao conectar: {str(e)}"}

    @classmethod
    def upsert_project(cls, project_data: Dict[str, Any], async_mode: bool = True) -> bool:
        """Salva ou atualiza os metadados do projeto na tabela 'projects' do Supabase."""
        url, key, enabled = cls._get_credentials()
        if not (enabled and url and key and project_data.get("id")):
            return False

        def _do_upsert():
            try:
                pid = project_data["id"]
                song_info = project_data.get("song_info", {})
                title = song_info.get("title") or "Sem título"
                artist = song_info.get("artist") or "Desconhecido"
                status = project_data.get("status", "created")
                created_at = project_data.get("created_at") or datetime.now().isoformat()
                updated_at = datetime.now().isoformat()

                payload = {
                    "id": pid,
                    "title": title,
                    "artist": artist,
                    "status": status,
                    "created_at": created_at,
                    "updated_at": updated_at,
                    "data": project_data
                }

                headers = {
                    "apikey": key,
                    "Authorization": f"Bearer {key}",
                    "Content-Type": "application/json",
                    "Prefer": "resolution=merge-duplicates"
                }

                resp = requests.post(
                    f"{url}/rest/v1/projects",
                    headers=headers,
                    json=payload,
                    timeout=8
                )
                if resp.status_code in [200, 201]:
                    logger.info(f"Projeto {pid} sincronizado com Supabase.")
                    return True
                else:
                    logger.warning(f"Erro ao sincronizar projeto {pid} no Supabase: {resp.status_code} - {resp.text}")
                    return False
            except Exception as e:
                logger.error(f"Exceção ao sincronizar projeto com Supabase: {e}")
                return False

        if async_mode:
            t = threading.Thread(target=_do_upsert, daemon=True)
            t.start()
            return True
        else:
            return _do_upsert()

    @classmethod
    def get_project(cls, project_id: str) -> Optional[Dict[str, Any]]:
        """Recupera projeto do Supabase caso não exista localmente."""
        url, key, _ = cls._get_credentials()
        if not (url and key):
            return None
        try:
            headers = {
                "apikey": key,
                "Authorization": f"Bearer {key}",
            }
            resp = requests.get(
                f"{url}/rest/v1/projects?id=eq.{project_id}&select=*",
                headers=headers,
                timeout=6
            )
            if resp.status_code == 200:
                rows = resp.json()
                if rows and len(rows) > 0:
                    return rows[0].get("data")
        except Exception as e:
            logger.error(f"Erro ao buscar projeto {project_id} do Supabase: {e}")
        return None

    @classmethod
    def list_projects(cls) -> List[Dict[str, Any]]:
        """Lista resumos de projetos armazenados no Supabase."""
        url, key, _ = cls._get_credentials()
        if not (url and key):
            return []
        try:
            headers = {
                "apikey": key,
                "Authorization": f"Bearer {key}",
            }
            resp = requests.get(
                f"{url}/rest/v1/projects?select=id,title,artist,status,created_at,updated_at&order=created_at.desc",
                headers=headers,
                timeout=6
            )
            if resp.status_code == 200:
                rows = resp.json()
                return [{
                    "id": r["id"],
                    "title": r.get("title") or "Sem título",
                    "artist": r.get("artist") or "Desconhecido",
                    "status": r.get("status") or "created",
                    "created_at": r.get("created_at"),
                    "updated_at": r.get("updated_at"),
                    "synced": True
                } for r in rows]
        except Exception as e:
            logger.error(f"Erro ao listar projetos do Supabase: {e}")
        return []

    @classmethod
    def sync_all_local_projects(cls) -> Dict[str, Any]:
        """Sincroniza todos os projetos locais salvos em disco com o Supabase."""
        if not cls.is_configured():
            return {"success": False, "message": "Supabase não configurado."}
        
        count = 0
        errors = 0
        if PROJECTS_DIR.exists():
            for pdir in PROJECTS_DIR.iterdir():
                if pdir.is_dir():
                    pfile = pdir / "project.json"
                    if pfile.exists():
                        try:
                            with open(pfile, "r", encoding="utf-8") as f:
                                data = json.load(f)
                            success = cls.upsert_project(data, async_mode=False)
                            if success:
                                count += 1
                            else:
                                errors += 1
                        except Exception as e:
                            logger.error(f"Erro lendo {pfile}: {e}")
                            errors += 1
        return {
            "success": True,
            "synced_count": count,
            "errors": errors,
            "message": f"{count} projetos sincronizados com o Supabase."
        }
