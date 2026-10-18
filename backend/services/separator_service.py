import os
import shutil
from pathlib import Path
from typing import Callable, Optional
from audio_separator.separator import Separator
from backend.config import MODELS_DIR, ensure_ffmpeg_path

# Available modes and their standard UVR MDX-Net models
SUPPORTED_MODELS = {
    "instrumental_clean": {
        "name": "Instrumental Limpo (Sem Vocais)",
        "model_file": "UVR-MDX-NET-Inst_HQ_3.onnx",
        "description": "Remove todos os vocais (principais e backing) com alta fidelidade."
    },
    "instrumental_with_backing": {
        "name": "Instrumental com Backing Vocals Preservados",
        "model_file": "UVR_MDXNET_KARA_2.onnx",
        "description": "Mantém coros e backing vocals na trilha instrumental para efeito karaokê enriquecido."
    },
    "vocals_only": {
        "name": "Isolar Faixa Vocal",
        "model_file": "UVR_MDXNET_Main.onnx",
        "description": "Extrai a voz isolada, ideal para transcrição ultra precisa."
    },
    "lead_vs_backing": {
        "name": "Separação Voz Principal vs Backing Vocals",
        "model_file": "UVR_MDXNET_KARA_2.onnx",
        "description": "Divide a música em voz solo e instrumental com backing vocals."
    }
}

class AudioSeparatorService:
    def __init__(self):
        ensure_ffmpeg_path()
        self.model_dir = str(MODELS_DIR)

    def separate_audio(
        self,
        audio_path: Path,
        output_dir: Path,
        mode: str = "instrumental_clean",
        custom_model: Optional[str] = None,
        progress_cb: Optional[Callable[[str, int], None]] = None
    ) -> dict:
        """
        Executes vocal separation using UVR MDX-Net via audio-separator.
        Returns a dictionary of generated stem paths.
        """
        output_dir.mkdir(parents=True, exist_ok=True)
        
        if mode == "original":
            if progress_cb:
                progress_cb("Usando áudio original sem separação...", 100)
            dest = output_dir / f"original_{audio_path.name}"
            shutil.copy2(audio_path, dest)
            return {
                "instrumental": str(dest),
                "mode": "original"
            }

        model_to_use = custom_model
        if not model_to_use:
            model_info = SUPPORTED_MODELS.get(mode, SUPPORTED_MODELS["instrumental_clean"])
            model_to_use = model_info["model_file"]

        if progress_cb:
            progress_cb(f"Inicializando modelo {model_to_use}...", 10)

        # Initialize audio-separator
        separator = Separator(
            output_dir=str(output_dir),
            output_format="WAV",
            model_file_dir=self.model_dir
        )

        if progress_cb:
            progress_cb(f"Carregando pesos do modelo {model_to_use} (download se necessário)...", 25)

        separator.load_model(model_filename=model_to_use)

        if progress_cb:
            progress_cb("Processando separação de faixas com IA...", 50)

        output_files = separator.separate(str(audio_path))

        if progress_cb:
            progress_cb("Separacão concluída com sucesso!", 95)

        # Classify outputs based on model and generated filenames
        result = {
            "mode": mode,
            "model_used": model_to_use,
            "all_outputs": [str(output_dir / f) for f in output_files],
            "instrumental": None,
            "vocals": None,
            "lead_vocals": None,
            "backing_vocals": None
        }

        for fname in output_files:
            fpath = str(output_dir / fname)
            lower = fname.lower()
            if "instrumental" in lower or "inst" in lower:
                result["instrumental"] = fpath
            elif "vocals" in lower or "vocal" in lower:
                result["vocals"] = fpath
                if "lead" in lower or "kara" in lower:
                    result["lead_vocals"] = fpath

        # Fallback if names differ
        if not result["instrumental"] and output_files:
            result["instrumental"] = str(output_dir / output_files[0])
        if not result["vocals"] and len(output_files) > 1:
            result["vocals"] = str(output_dir / output_files[1])

        if progress_cb:
            progress_cb("Processamento finalizado.", 100)

        return result
