from pathlib import Path
from typing import Callable, List, Optional
from faster_whisper import WhisperModel
from backend.config import MODELS_DIR

class TranscriberService:
    def __init__(self, model_size: str = "base"):
        self.model_size = model_size
        self._model = None

    def get_model(self, model_size: Optional[str] = None) -> WhisperModel:
        size = model_size or self.model_size
        if self._model is None or self.model_size != size:
            self.model_size = size
            # Runs on CPU with int8 quantization for fast and low-memory execution
            self._model = WhisperModel(
                self.model_size,
                device="cpu",
                compute_type="int8",
                download_root=str(MODELS_DIR / "whisper")
            )
        return self._model

    def transcribe_with_alignment(
        self,
        audio_path: Path,
        language: Optional[str] = None,
        model_size: Optional[str] = None,
        progress_cb: Optional[Callable[[str, int], None]] = None
    ) -> dict:
        """
        Transcribes the audio with word-level timestamps using faster-whisper.
        Returns detected language, full text, and array of lyric lines with words.
        """
        if progress_cb:
            progress_cb(f"Carregando Whisper ({model_size or self.model_size})...", 10)

        model = self.get_model(model_size)

        if progress_cb:
            progress_cb("Processando transcrição e sincronização de palavras...", 35)

        # Transcribe with word_timestamps and music-tuned VAD filter so instrumental solos/intros do not cause hallucinated lyrics
        vad_params = {
            "threshold": 0.45,
            "min_silence_duration_ms": 600,
            "speech_pad_ms": 250
        }
        segments, info = model.transcribe(
            str(audio_path),
            language=language if language and language != "auto" else None,
            word_timestamps=True,
            vad_filter=True,
            vad_parameters=vad_params
        )

        lines = []
        raw_text_parts = []
        seg_list = list(segments)
        total_segs = len(seg_list)

        for idx, segment in enumerate(seg_list):
            seg_text = segment.text.strip()
            if not seg_text:
                continue

            raw_text_parts.append(seg_text)

            words = []
            if segment.words:
                for w in segment.words:
                    clean_word = w.word.strip()
                    if clean_word:
                        words.append({
                            "word": clean_word,
                            "start": round(w.start, 2),
                            "end": round(w.end, 2),
                            "probability": round(w.probability, 2)
                        })

            # If word timestamps are missing for some segment, fall back to evenly distributed words
            if not words and seg_text:
                tokens = seg_text.split()
                duration = max(0.2, segment.end - segment.start)
                word_dur = duration / len(tokens)
                for i, tok in enumerate(tokens):
                    words.append({
                        "word": tok,
                        "start": round(segment.start + i * word_dur, 2),
                        "end": round(segment.start + (i + 1) * word_dur, 2),
                        "probability": 1.0
                    })

            lines.append({
                "id": f"line_{idx + 1}",
                "start": round(segment.start, 2),
                "end": round(segment.end, 2),
                "text": seg_text,
                "words": words
            })

            if progress_cb and total_segs > 0:
                pct = 35 + int((idx + 1) / total_segs * 60)
                progress_cb(f"Processando linha {idx + 1} de {total_segs}...", pct)

        if progress_cb:
            progress_cb("Transcrição concluída com sucesso!", 100)

        return {
            "detected_language": info.language,
            "language_probability": round(info.language_probability, 2),
            "duration": round(info.duration, 2),
            "full_text": "\n".join(raw_text_parts),
            "lines": lines
        }
