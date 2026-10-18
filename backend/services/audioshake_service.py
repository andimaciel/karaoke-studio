import os
import requests
from pathlib import Path
from typing import Optional, Dict, Any
from backend.config import get_settings

class AudioShakeService:
    BASE_URL = "https://api.audioshake.ai/v1"

    @classmethod
    def get_api_key(cls) -> Optional[str]:
        settings = get_settings()
        key = settings.get("audioshake_api_key") or os.environ.get("AUDIOSHAKE_API_KEY")
        return key.strip() if key else None

    @classmethod
    def is_available(cls) -> bool:
        key = cls.get_api_key()
        return bool(key and len(key) > 5)

    @classmethod
    def get_status_info(cls) -> Dict[str, Any]:
        key = cls.get_api_key()
        if not key:
            return {
                "available": False,
                "provider": "AudioShake (Nuvem)",
                "status": "Não configurado",
                "message": "Nenhuma chave de API configurada. O Karaokê Studio utilizará o motor local UVR / MDX-Net sem custos adicionais."
            }
        return {
            "available": True,
            "provider": "AudioShake (Nuvem)",
            "status": "Configurado e ativo",
            "message": "Atenção: Ao processar via AudioShake, o arquivo de áudio será enviado para a nuvem da AudioShake e consumirá créditos da sua conta."
        }

    @classmethod
    def submit_separation(cls, audio_file: Path, format: str = "stems") -> Dict[str, Any]:
        key = cls.get_api_key()
        if not key:
            raise ValueError("AudioShake API Key não configurada.")

        headers = {
            "Authorization": f"Bearer {key}"
        }

        # Submit separation request
        with open(audio_file, "rb") as f:
            files = {"file": (audio_file.name, f)}
            data = {"targets": "vocals,instrumental"}
            resp = requests.post(
                f"{cls.BASE_URL}/stem-separation",
                headers=headers,
                files=files,
                data=data,
                timeout=60
            )

        if resp.status_code not in (200, 201, 202):
            raise RuntimeError(f"AudioShake API Error ({resp.status_code}): {resp.text}")

        return resp.json()
