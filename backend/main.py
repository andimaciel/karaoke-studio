import os
import shutil
import threading
from pathlib import Path
from typing import Optional, Dict, Any, List
from fastapi import FastAPI, UploadFile, File, Form, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from backend.config import (
    PROJECTS_DIR, TEMP_DIR, ensure_ffmpeg_path,
    get_settings, update_settings, FFMPEG_BIN
)
from backend.jobs import JobManager
from backend.services.audio_extractor import inspect_media_file, extract_standard_audio
from backend.services.separator_service import AudioSeparatorService, SUPPORTED_MODELS
from backend.services.transcriber_service import TranscriberService
from backend.services.lyric_aligner import LyricAlignerService
from backend.services.video_renderer import VideoRendererService
from backend.services.audioshake_service import AudioShakeService
from backend.services.supabase_service import SupabaseService

# Initialize app
app = FastAPI(title="Karaokê Studio API", version="1.0.0")

# CORS setup for Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static media directory
app.mount("/media", StaticFiles(directory=str(PROJECTS_DIR)), name="media")

# Singletons for services
separator_svc = AudioSeparatorService()
transcriber_svc = TranscriberService()

# ----------------- Models -----------------
class SongInfoUpdate(BaseModel):
    title: Optional[str] = ""
    artist: Optional[str] = ""
    language: Optional[str] = "auto"
    show_intro: Optional[bool] = True
    intro_mode: Optional[str] = "text"  # "none", "text", "logo", "both"
    logo_url: Optional[str] = None
    logo_path: Optional[str] = None

class SeparationRequest(BaseModel):
    mode: str = "instrumental_clean"  # instrumental_clean, instrumental_with_backing, lead_vs_backing, vocals_only, original
    custom_model: Optional[str] = None
    provider: str = "local"  # local or audioshake

class TranscribeRequest(BaseModel):
    language: Optional[str] = "auto"
    model_size: Optional[str] = "base"
    use_vocals_stem: bool = True

class AlignLyricsRequest(BaseModel):
    manual_text: str

class UpdateLyricsRequest(BaseModel):
    lines: List[Dict[str, Any]]

class RenderRequest(BaseModel):
    audio_type: str = "instrumental"  # instrumental, vocals, lead_vocals, original
    lines: Optional[List[Dict[str, Any]]] = None
    background: Dict[str, Any] = {"type": "gradient", "color": "#090a0f"}
    style: Dict[str, Any] = {
        "font_name": "Arial",
        "font_size": 48,
        "primary_color": "&H00FFFFFF",
        "karaoke_color": "&H00D946EF",
        "alignment": 2,
        "margin_v": 60
    }

class SettingsUpdate(BaseModel):
    audioshake_api_key: Optional[str] = None
    whisper_model_size: Optional[str] = None
    default_separation_model: Optional[str] = None
    supabase_url: Optional[str] = None
    supabase_key: Optional[str] = None
    supabase_sync_enabled: Optional[bool] = None

# ----------------- Routes -----------------

@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "ffmpeg": bool(FFMPEG_BIN),
        "audioshake": AudioShakeService.get_status_info(),
        "supabase": SupabaseService.test_connection()
    }

@app.get("/api/settings")
async def get_app_settings():
    settings = get_settings()
    settings["audioshake_status"] = AudioShakeService.get_status_info()
    settings["supabase_status"] = SupabaseService.test_connection()
    settings["supported_models"] = SUPPORTED_MODELS
    return settings

@app.post("/api/settings")
async def update_app_settings(data: SettingsUpdate):
    updates = {}
    if data.audioshake_api_key is not None:
        updates["audioshake_api_key"] = data.audioshake_api_key.strip()
    if data.whisper_model_size is not None:
        updates["whisper_model_size"] = data.whisper_model_size
    if data.default_separation_model is not None:
        updates["default_separation_model"] = data.default_separation_model
    if data.supabase_url is not None:
        updates["supabase_url"] = data.supabase_url.strip()
    if data.supabase_key is not None:
        updates["supabase_key"] = data.supabase_key.strip()
    if data.supabase_sync_enabled is not None:
        updates["supabase_sync_enabled"] = data.supabase_sync_enabled
    return update_settings(updates)

@app.get("/api/projects")
async def list_projects():
    return JobManager.list_projects()

@app.get("/api/project/{project_id}")
async def get_project(project_id: str):
    proj = JobManager.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Projeto não encontrado.")
    return proj

@app.delete("/api/project/{project_id}")
async def delete_project(project_id: str):
    JobManager.delete_project(project_id)
    return {"success": True, "message": f"Projeto {project_id} excluído com sucesso."}

@app.get("/api/supabase/status")
async def get_supabase_status():
    return SupabaseService.test_connection()

@app.post("/api/supabase/sync")
async def sync_supabase_projects():
    result = SupabaseService.sync_all_local_projects()
    return result

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    """Etapa 1: Upload de áudio ou vídeo e inspeção imediata de metadados."""
    project_id = JobManager.create_project()
    project_dir = PROJECTS_DIR / project_id
    
    # Save original uploaded file
    original_path = project_dir / f"original_{file.filename}"
    content = await file.read()
    with open(original_path, "wb") as f:
        f.write(content)


    # Inspect media with ffprobe
    try:
        media_info = inspect_media_file(original_path)
    except Exception as e:
        # Fallback metadata if ffprobe fails
        media_info = {
            "duration": 180.0,
            "size_bytes": original_path.stat().st_size if original_path.exists() else 0,
            "format_name": Path(file.filename).suffix.lstrip("."),
            "has_video": False,
            "channels": 2,
            "sample_rate": 44100,
            "suggested_title": Path(file.filename).stem,
            "suggested_artist": ""
        }

    has_video = media_info.get("has_video", False)
    standard_audio_path = project_dir / "standard_audio.wav"

    if has_video:
        try:
            extract_standard_audio(original_path, standard_audio_path)
            audio_path_to_use = standard_audio_path
            audio_url_to_use = f"/media/{project_id}/standard_audio.wav"
        except Exception:
            audio_path_to_use = original_path
            audio_url_to_use = f"/media/{project_id}/{original_path.name}"
    else:
        # File is already audio (MP3, WAV, FLAC, M4A, etc.) - instantaneous!
        audio_path_to_use = original_path
        audio_url_to_use = f"/media/{project_id}/{original_path.name}"

    # Update project state
    media_data = {
        "original_filename": file.filename,
        "original_file_url": f"/media/{project_id}/{original_path.name}",
        "audio_url": audio_url_to_use,
        "audio_path": str(audio_path_to_use),
        "duration": media_info.get("duration", 180.0),
        "size_bytes": media_info.get("size_bytes", 0),
        "format": media_info.get("format_name", "audio"),
        "has_video": has_video,
        "channels": media_info.get("channels", 2),
        "sample_rate": media_info.get("sample_rate", 44100)
    }

    song_info = {
        "title": media_info.get("suggested_title") or Path(file.filename).stem,
        "artist": media_info.get("suggested_artist") or "",
        "language": "auto",
        "show_intro": True
    }

    JobManager.update_project(project_id, {
        "status": "ready_for_info",
        "progress": 100,
        "message": "Áudio processado e pronto para configuração.",
        "media": media_data,
        "song_info": song_info
    })

    return JobManager.get_project(project_id)


@app.post("/api/project/{project_id}/song-info")
async def update_song_info(project_id: str, data: SongInfoUpdate):
    """Etapa 2: Atualização de informações da música."""
    proj = JobManager.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Projeto não encontrado.")

    info = proj.get("song_info", {})
    if data.title is not None:
        info["title"] = data.title.strip()
    if data.artist is not None:
        info["artist"] = data.artist.strip()
    if data.language is not None:
        info["language"] = data.language
    if data.show_intro is not None:
        info["show_intro"] = data.show_intro
    if data.intro_mode is not None:
        info["intro_mode"] = data.intro_mode
        info["show_intro"] = data.intro_mode != "none"
    if data.logo_url is not None:
        info["logo_url"] = data.logo_url
    if data.logo_path is not None:
        info["logo_path"] = data.logo_path

    JobManager.update_project(project_id, {"song_info": info})
    return JobManager.get_project(project_id)

@app.post("/api/project/{project_id}/separate")
async def start_separation(project_id: str, req: SeparationRequest, bg_tasks: BackgroundTasks):

    """Etapa 3: Inicia a separação vocal com IA UVR / MDX-Net."""
    proj = JobManager.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Projeto não encontrado.")

    audio_path = proj.get("media", {}).get("audio_path")
    if not audio_path or not Path(audio_path).exists():
        raise HTTPException(status_code=400, detail="Trilha de áudio do projeto não encontrada.")

    # Check provider
    if req.provider == "audioshake":
        if not AudioShakeService.is_available():
            raise HTTPException(
                status_code=400,
                detail="Provedor AudioShake não configurado. Adicione sua chave de API nas configurações ou utilize o motor Local (UVR)."
            )

    def run_sep():
        try:
            JobManager.update_project(project_id, {
                "status": "separating",
                "progress": 5,
                "message": f"Iniciando separação com modo '{req.mode}'..."
            })

            def progress_cb(msg, pct):
                JobManager.update_project(project_id, {
                    "progress": pct,
                    "message": msg
                })

            output_dir = PROJECTS_DIR / project_id / "stems"
            res = separator_svc.separate_audio(
                audio_path=Path(audio_path),
                output_dir=output_dir,
                mode=req.mode,
                custom_model=req.custom_model,
                progress_cb=progress_cb
            )

            # Generate URLs
            inst_path = res.get("instrumental")
            voc_path = res.get("vocals")
            lead_path = res.get("lead_vocals")

            sep_data = {
                "status": "completed",
                "mode": req.mode,
                "model_used": res.get("model_used"),
                "instrumental_path": inst_path,
                "instrumental_url": f"/media/{project_id}/stems/{Path(inst_path).name}" if inst_path else None,
                "vocals_path": voc_path,
                "vocals_url": f"/media/{project_id}/stems/{Path(voc_path).name}" if voc_path else None,
                "lead_vocals_path": lead_path,
                "lead_vocals_url": f"/media/{project_id}/stems/{Path(lead_path).name}" if lead_path else None,
            }

            JobManager.update_project(project_id, {
                "status": "separated",
                "progress": 100,
                "message": "Separação vocal concluída com sucesso!",
                "separation": sep_data
            })

        except Exception as e:
            JobManager.update_project(project_id, {
                "status": "error",
                "progress": 0,
                "message": f"Erro durante separação: {str(e)}"
            })

    bg_tasks.add_task(run_sep)
    return {"status": "started", "message": "Separação iniciada em segundo plano."}

@app.post("/api/project/{project_id}/transcribe")
async def start_transcription(project_id: str, req: TranscribeRequest, bg_tasks: BackgroundTasks):
    """Etapa 3: Transcreve o áudio e gera alinhamento palavra por palavra com faster-whisper."""
    proj = JobManager.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Projeto não encontrado.")

    # Choose audio for transcription: isolated vocals if available, else standard audio
    vocal_path = proj.get("separation", {}).get("vocals_path")
    audio_path = proj.get("media", {}).get("audio_path")
    target_path = vocal_path if (req.use_vocals_stem and vocal_path and Path(vocal_path).exists()) else audio_path

    if not target_path or not Path(target_path).exists():
        raise HTTPException(status_code=400, detail="Arquivo de áudio para transcrição não encontrado.")

    def run_transcribe():
        try:
            JobManager.update_project(project_id, {
                "status": "transcribing",
                "progress": 5,
                "message": "Carregando modelo faster-whisper..."
            })

            def progress_cb(msg, pct):
                JobManager.update_project(project_id, {
                    "progress": pct,
                    "message": msg
                })

            lang = req.language or proj.get("song_info", {}).get("language", "auto")
            res = transcriber_svc.transcribe_with_alignment(
                audio_path=Path(target_path),
                language=lang,
                model_size=req.model_size or "base",
                progress_cb=progress_cb
            )

            lyrics_data = {
                "detected_language": res["detected_language"],
                "language_probability": res["language_probability"],
                "full_text": res["full_text"],
                "lines": res["lines"]
            }

            JobManager.update_project(project_id, {
                "status": "transcribed",
                "progress": 100,
                "message": f"Transcrição concluída ({len(res['lines'])} linhas alinhadas).",
                "lyrics": lyrics_data
            })

        except Exception as e:
            JobManager.update_project(project_id, {
                "status": "error",
                "progress": 0,
                "message": f"Erro na transcrição: {str(e)}"
            })

    bg_tasks.add_task(run_transcribe)
    return {"status": "started", "message": "Transcrição iniciada em segundo plano."}

@app.post("/api/project/{project_id}/lyrics/align")
async def align_manual_lyrics(project_id: str, req: AlignLyricsRequest):
    """Alinha letra colada manualmente com o áudio transcrito."""
    proj = JobManager.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Projeto não encontrado.")

    # Always prioritize isolated vocal track if separation has completed
    vocal_path = proj.get("separation", {}).get("vocals_path")
    audio_path = proj.get("media", {}).get("audio_path")
    target_path = vocal_path if (vocal_path and Path(vocal_path).exists()) else audio_path

    current_lines = proj.get("lyrics", {}).get("lines", [])
    if not current_lines and target_path and Path(target_path).exists():
        lang = proj.get("song_info", {}).get("language", "auto")
        try:
            res = transcriber_svc.transcribe_with_alignment(
                audio_path=Path(target_path),
                language=lang,
                model_size="base"
            )
            current_lines = res.get("lines", [])
        except Exception:
            pass

    aligned_lines = LyricAlignerService.align_manual_lyrics(req.manual_text, current_lines)

    lyrics_data = proj.get("lyrics", {})
    lyrics_data["lines"] = aligned_lines
    lyrics_data["full_text"] = req.manual_text

    JobManager.update_project(project_id, {
        "lyrics": lyrics_data,
        "message": f"Letra manual alinhada ({len(aligned_lines)} linhas)."
    })
    return JobManager.get_project(project_id)

@app.post("/api/project/{project_id}/lyrics/update")
async def update_lyrics(project_id: str, req: UpdateLyricsRequest):
    """Salva edições feitas pelo usuário no editor visual de karaokê."""
    proj = JobManager.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Projeto não encontrado.")

    lyrics_data = proj.get("lyrics", {})
    lyrics_data["lines"] = req.lines
    lyrics_data["full_text"] = "\n".join([l.get("text", "") for l in req.lines])

    JobManager.update_project(project_id, {
        "lyrics": lyrics_data,
        "message": "Letras atualizadas com sucesso."
    })
    return JobManager.get_project(project_id)

@app.post("/api/project/{project_id}/lyrics/upload-srt")
async def upload_srt_file(project_id: str, file: UploadFile = File(...)):
    """Importa legendas no formato .SRT para preencher automaticamente as estrofes e marcas de tempo."""
    proj = JobManager.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Projeto não encontrado.")

    content_bytes = await file.read()
    try:
        content_str = content_bytes.decode("utf-8")
    except UnicodeDecodeError:
        content_str = content_bytes.decode("latin-1", errors="replace")

    parsed_lines = LyricAlignerService.parse_srt(content_str)
    if not parsed_lines:
        raise HTTPException(status_code=400, detail="Não foi possível identificar legendas válidas no arquivo .SRT enviado.")

    lyrics_data = proj.get("lyrics", {})
    lyrics_data["lines"] = parsed_lines
    lyrics_data["full_text"] = "\n".join([l.get("text", "") for l in parsed_lines])

    JobManager.update_project(project_id, {
        "lyrics": lyrics_data,
        "message": f"Legenda .SRT importada com sucesso ({len(parsed_lines)} estrofes)."
    })
    return JobManager.get_project(project_id)

@app.post("/api/project/{project_id}/background/upload")
async def upload_background(project_id: str, file: UploadFile = File(...)):
    """Upload de imagem ou vídeo de fundo personalizado para o karaokê."""
    proj = JobManager.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Projeto não encontrado.")

    project_dir = PROJECTS_DIR / project_id
    bg_file_path = project_dir / f"bg_{file.filename}"
    content = await file.read()
    with open(bg_file_path, "wb") as f:
        f.write(content)


    is_video = file.content_type and "video" in file.content_type
    bg_url = f"/media/{project_id}/{bg_file_path.name}"
    bg_conf = {
        "type": "video" if is_video else "image",
        "url": bg_url,
        "image_path": str(bg_file_path) if not is_video else None,
        "video_path": str(bg_file_path) if is_video else None
    }
    JobManager.update_project(project_id, {"background": bg_conf})

    return {
        "url": bg_url,
        "path": str(bg_file_path),
        "type": "video" if is_video else "image"
    }

@app.post("/api/project/{project_id}/logo/upload")
async def upload_logo(project_id: str, file: UploadFile = File(...)):
    """Upload de imagem/logo do artista ou da banda para a vinheta de abertura."""
    proj = JobManager.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Projeto não encontrado.")

    project_dir = PROJECTS_DIR / project_id
    logo_file_path = project_dir / f"logo_{file.filename}"
    content = await file.read()
    with open(logo_file_path, "wb") as f:
        f.write(content)

    song_info = proj.get("song_info", {})
    song_info["logo_path"] = str(logo_file_path)
    song_info["logo_url"] = f"/media/{project_id}/logo_{file.filename}"
    if song_info.get("intro_mode") in [None, "none"]:
        song_info["intro_mode"] = "logo"
    song_info["show_intro"] = True

    JobManager.update_project(project_id, {"song_info": song_info})
    return {
        "url": song_info["logo_url"],
        "path": song_info["logo_path"],
        "project": JobManager.get_project(project_id)
    }

@app.post("/api/project/{project_id}/render")
async def render_video(project_id: str, req: RenderRequest, bg_tasks: BackgroundTasks):
    """Etapa final: Renderiza o vídeo MP4 final em 1080p 30fps com H.264 e AAC."""
    proj = JobManager.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Projeto não encontrado.")

    # Select audio track for final video
    audio_type = req.audio_type
    sep_data = proj.get("separation", {})
    if audio_type == "instrumental" and sep_data.get("instrumental_path"):
        chosen_audio = Path(sep_data["instrumental_path"])
    elif audio_type == "vocals" and sep_data.get("vocals_path"):
        chosen_audio = Path(sep_data["vocals_path"])
    elif audio_type == "lead_vocals" and sep_data.get("lead_vocals_path"):
        chosen_audio = Path(sep_data["lead_vocals_path"])
    else:
        chosen_audio = Path(proj.get("media", {}).get("audio_path"))

    if not chosen_audio or not chosen_audio.exists():
        raise HTTPException(status_code=400, detail="Arquivo de áudio selecionado não encontrado.")

    if req.lines:
        lines = req.lines
        lyrics_data = proj.get("lyrics", {})
        lyrics_data["lines"] = req.lines
        JobManager.update_project(project_id, {"lyrics": lyrics_data})
    else:
        lines = proj.get("lyrics", {}).get("lines", [])

    if not lines:
        raise HTTPException(status_code=400, detail="Nenhuma letra sincronizada disponível para renderização.")

    # Always persist chosen style and background to project
    JobManager.update_project(project_id, {
        "style": req.style,
        "background": req.background
    })

    def run_render():
        try:
            JobManager.update_project(project_id, {
                "render": {
                    "status": "rendering",
                    "progress": 5,
                    "message": "Inicializando renderização do vídeo MP4..."
                }
            })

            def progress_cb(msg, pct):
                JobManager.update_project(project_id, {
                    "render": {
                        "status": "rendering",
                        "progress": pct,
                        "message": msg
                    }
                })

            output_video_path = PROJECTS_DIR / project_id / "karaoke_final.mp4"
            fresh_proj = JobManager.get_project(project_id) or proj
            song_info = fresh_proj.get("song_info", {})

            VideoRendererService.render_karaoke_video(
                audio_path=chosen_audio,
                lines=lines,
                output_path=output_video_path,
                background_config=req.background,
                style_config=req.style,
                song_info=song_info,
                progress_cb=progress_cb
            )

            # Export ASS and instrumental links
            ass_path = PROJECTS_DIR / project_id / "karaoke_final.ass"

            JobManager.update_project(project_id, {
                "render": {
                    "status": "completed",
                    "progress": 100,
                    "message": "Vídeo renderizado com sucesso!",
                    "video_url": f"/media/{project_id}/karaoke_final.mp4",
                    "ass_url": f"/media/{project_id}/karaoke_final.ass" if ass_path.exists() else None,
                    "instrumental_url": f"/media/{project_id}/stems/{Path(chosen_audio).name}" if "stems" in str(chosen_audio) else f"/media/{project_id}/standard_audio.wav"
                }
            })

        except Exception as e:
            JobManager.update_project(project_id, {
                "render": {
                    "status": "error",
                    "progress": 0,
                    "message": f"Erro na renderização: {str(e)}"
                }
            })

    bg_tasks.add_task(run_render)
    return {"status": "started", "message": "Renderização do vídeo iniciada em segundo plano."}

@app.get("/api/project/{project_id}/export/{format}")
async def export_file(project_id: str, format: str):
    """Exporta MP4, Instrumental WAV/MP3, ASS ou SRT com prevenção de cache."""
    proj = JobManager.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Projeto não encontrado.")

    title = proj.get("song_info", {}).get("title") or "karaoke"
    clean_title = "".join(c for c in title if c.isalnum() or c in " _-").strip()
    no_cache_headers = {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
    }

    if format == "mp4":
        p = PROJECTS_DIR / project_id / "karaoke_final.mp4"
        if not p.exists():
            raise HTTPException(status_code=404, detail="Vídeo ainda não foi renderizado.")
        return FileResponse(p, filename=f"{clean_title}_karaoke.mp4", media_type="video/mp4", headers=no_cache_headers)

    elif format == "ass":
        lines = proj.get("lyrics", {}).get("lines", [])
        style = proj.get("style", {})
        ass_str = LyricAlignerService.generate_ass(lines, style)
        p = PROJECTS_DIR / project_id / f"{clean_title}.ass"
        with open(p, "w", encoding="utf-8") as f:
            f.write(ass_str)
        return FileResponse(p, filename=f"{clean_title}.ass", media_type="text/plain", headers=no_cache_headers)

    elif format == "srt":
        lines = proj.get("lyrics", {}).get("lines", [])
        srt_str = LyricAlignerService.generate_srt(lines)
        p = PROJECTS_DIR / project_id / f"{clean_title}.srt"
        with open(p, "w", encoding="utf-8") as f:
            f.write(srt_str)
        return FileResponse(p, filename=f"{clean_title}.srt", media_type="text/plain", headers=no_cache_headers)

    elif format == "audio":
        sep = proj.get("separation", {})
        inst_path = sep.get("instrumental_path") or proj.get("media", {}).get("audio_path")
        if not inst_path or not Path(inst_path).exists():
            raise HTTPException(status_code=404, detail="Áudio não disponível.")
        return FileResponse(Path(inst_path), filename=f"{clean_title}_instrumental.wav", media_type="audio/wav", headers=no_cache_headers)

    raise HTTPException(status_code=400, detail="Formato de exportação inválido.")
